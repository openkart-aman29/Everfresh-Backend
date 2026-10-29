import {
    DEFAULT_ENQUIRY_COMPANY_ID,
    ENQUIRY_NOTIFICATION_EMAIL,
} from '@/configurations/ENV_Configuration';
import EmailDispatcher from '@/utilities/email/services/Email_Dispatcher';
import { enquiryLogger } from '@/features/enquiries/logger/Enquiry_Logger';
import { createEnquiryDAO } from '@/features/enquiries/operations/create/dao/Create_Enquiry_Dao';
import {
    CreateEnquiryRequest,
    CreateEnquiryResponse,
    EnquiryRequestContext,
} from '@/features/enquiries/interfaces/Enquiry.interface';
import { StandardResponseInterface } from '@/utilities/global_interfaces/Standard_Response_Interface';
import { getErrorStatus } from '@/utilities/http/constants/HTTP_Status_Codes';
import { generateULID } from '@/utilities/id_generator/ULID_Generator';
import { sseManager } from '@/utilities/sse/SSE_Manager';
import {
    googleMapsUrl,
    reverseGeocode,
} from '@/utilities/geocoding/Reverse_Geocode_Service';

/**
 * Sends without holding up the response.
 *
 * The enquiry row is committed before any mail is attempted, so the visitor has
 * nothing to gain from waiting on a provider. Blocking on two sends took the
 * endpoint from 766ms to 7.2s, which the visitor experiences as a stuck button.
 * Failures are logged here and deliberately never rethrown: there is no caller
 * left to handle them.
 */
const sendDetached = (
    label: string,
    enquiryId: string,
    send: () => Promise<void>
): void => {
    void send()
        .then(() => {
            enquiryLogger.info(`${label} sent`, { enquiryId });
        })
        .catch((emailError: unknown) => {
            enquiryLogger.error(`Failed to send ${label}`, {
                enquiryId,
                error: describeError(emailError),
            });
        });
};

/**
 * Winston serialises a bare Error to `{}`, which is how a Brevo 401 reached the
 * logs as `"error":{}`. Pull the readable parts out before logging.
 */
const describeError = (error: unknown) => {
    if (error instanceof Error) {
        return { message: error.message, name: error.name };
    }
    return { message: String(error) };
};

/** Shown in the footer and the "call us" line of the visitor's confirmation. */
const COMPANY_PHONE = '+971544672878';
const WORKING_HOURS = 'Monday to Saturday, 8:00 to 18:00';

/**
 * Records a service request raised from the public website.
 *
 * No authentication is involved, so the tenant comes from configuration rather
 * than from the caller, and every field that reaches the database is either
 * validated at the controller or derived server-side.
 */
export const createEnquiryService = async (
    input: CreateEnquiryRequest,
    context: EnquiryRequestContext
): Promise<StandardResponseInterface<CreateEnquiryResponse | null>> => {
    try {
        const companyId = DEFAULT_ENQUIRY_COMPANY_ID;

        // A misconfigured tenant is an operator error, not a visitor error.
        if (!companyId) {
            enquiryLogger.error('DEFAULT_ENQUIRY_COMPANY_ID is not configured', {
                action: 'CREATE_ENQUIRY',
            });
            const status = 500;
            return {
                success: false,
                status,
                message: 'ENQUIRY_DESTINATION_NOT_CONFIGURED',
                code: getErrorStatus(status),
                data: null,
                errors: [{ field: 'server', message: 'Enquiries are not accepting submissions' }],
            };
        }

        enquiryLogger.info('Create enquiry - service', {
            action: 'CREATE_ENQUIRY',
            companyId,
            email: input.email,
            serviceId: input.service_id ?? null,
        });

        // If a catalogue service was named, it must belong to this tenant.
        // Reject a mismatch rather than silently dropping the reference.
        let serviceName: string | null = input.service_name?.trim() || null;

        if (input.service_id) {
            const service = await createEnquiryDAO.findServiceForCompany(input.service_id, companyId);

            if (!service) {
                enquiryLogger.warn('Enquiry referenced an unknown service', {
                    serviceId: input.service_id,
                    companyId,
                });
                const status = 400;
                return {
                    success: false,
                    status,
                    message: 'SERVICE_NOT_FOUND',
                    code: getErrorStatus(status),
                    data: null,
                    errors: [{ field: 'service_id', message: 'Selected service is not available' }],
                };
            }

            serviceName = service.service_name;
        }

        // Resolve a shared point to an address before the row is written, so the
        // label is already there the first time an admin opens the lead. Fully
        // contained: a missing key, a slow provider or a quota breach returns
        // null and the coordinates are stored on their own.
        const geocoded =
            input.latitude !== null &&
            input.latitude !== undefined &&
            input.longitude !== null &&
            input.longitude !== undefined
                ? await reverseGeocode(input.latitude, input.longitude)
                : null;

        const enquiryId = generateULID();
        const enquiry = await createEnquiryDAO.insertEnquiry(
            enquiryId,
            companyId,
            input,
            serviceName,
            context,
            geocoded
        );

        // Push to any connected admin/staff dashboards, mirroring bookings.
        // A transport failure must never fail the visitor's submission.
        try {
            sseManager.broadcast(
                'enquiry_created',
                {
                    enquiry_id: enquiry.enquiry_id,
                    full_name: enquiry.full_name,
                    email: enquiry.email,
                    phone: enquiry.phone,
                    service_id: enquiry.service_id,
                    service_name: enquiry.service_name,
                    preferred_date: enquiry.preferred_date,
                    preferred_time: enquiry.preferred_time,
                    latitude: enquiry.latitude,
                    longitude: enquiry.longitude,
                    resolved_address: enquiry.resolved_address,
                    status: enquiry.status,
                    created_at: enquiry.created_at,
                },
                companyId
            );
        } catch (sseError) {
            enquiryLogger.warn('Failed to broadcast enquiry_created', {
                enquiryId,
                error: describeError(sseError),
            });
        }

        // Notify the business inbox. Sent server-side so no API key reaches the
        // browser, and detached so the visitor is not kept waiting on a provider.
        if (ENQUIRY_NOTIFICATION_EMAIL) {
            sendDetached('enquiry notification email', enquiryId, () =>
                EmailDispatcher.sendTemplateEmail(
                    'new-enquiry',
                    {
                        enquiryId: enquiry.enquiry_id,
                        fullName: enquiry.full_name,
                        email: enquiry.email,
                        phone: enquiry.phone,
                        serviceName: enquiry.service_name,
                        preferredDate: enquiry.preferred_date,
                        preferredTime: enquiry.preferred_time,
                        resolvedAddress: enquiry.resolved_address,
                        mapUrl:
                            enquiry.latitude !== null && enquiry.longitude !== null
                                ? googleMapsUrl(enquiry.latitude, enquiry.longitude)
                                : null,
                        message: enquiry.message,
                    },
                    {
                        to: ENQUIRY_NOTIFICATION_EMAIL,
                        subject: `New service request from ${enquiry.full_name}`,
                    }
                )
            );
        } else {
            enquiryLogger.warn('ENQUIRY_NOTIFICATION_EMAIL not set - no notification sent', {
                enquiryId,
            });
        }

        // Acknowledge to the visitor. Until this existed a customer booked and
        // received nothing in writing. Detached like the notification above: the
        // lead is already persisted, and a mail outage must not undo it.
        sendDetached('enquiry confirmation to visitor', enquiryId, () =>
            EmailDispatcher.sendTemplateEmail(
                'enquiry-confirmation',
                {
                    fullName: enquiry.full_name,
                    enquiryId: enquiry.enquiry_id,
                    serviceName: enquiry.service_name,
                    preferredDate: enquiry.preferred_date,
                    preferredTime: enquiry.preferred_time,
                    resolvedAddress: enquiry.resolved_address,
                    message: enquiry.message,
                    companyPhone: COMPANY_PHONE,
                    workingHours: WORKING_HOURS,
                },
                {
                    to: enquiry.email,
                    subject: `We have your request - ${enquiry.enquiry_id}`,
                }
            )
        );

        enquiryLogger.info('Enquiry created successfully', { enquiryId, companyId });

        const status = 201;
        return {
            success: true,
            status,
            message: 'ENQUIRY_SUBMITTED_SUCCESSFULLY',
            code: 'SUCCESS',
            data: {
                enquiry_id: enquiry.enquiry_id,
                status: enquiry.status,
                created_at: enquiry.created_at,
            },
            errors: [],
        };
    } catch (error) {
        enquiryLogger.error('Error in create enquiry service', {
            action: 'CREATE_ENQUIRY',
            error: describeError(error),
        });
        const status = 500;
        return {
            success: false,
            status,
            message: 'INTERNAL_SERVER_ERROR',
            code: getErrorStatus(status),
            data: null,
            errors: [{ field: 'server', message: 'Internal server error' }],
        };
    }
};
