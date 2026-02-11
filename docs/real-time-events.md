# Real-Time Events (SSE) Documentation

## Overview
The EverFresh Backend uses Server-Sent Events (SSE) to push real-time updates to connected clients. This is primarily used to notify staff members of new bookings without requiring a manual page refresh.

## Connection Details
- **Endpoint:** `GET /sse/events`
- **Authentication:** Required (Bearer Token)
- **Authorization:** Role `staff`, `admin`, `superadmin`
- **Headers:**
    - `Authorization`: `Bearer <token>`
    - `Accept`: `text/event-stream`

## Event Types

### `connection_established`
Sent immediately upon successful connection.
```json
{
  "type": "connection_established",
  "message": "Connected to SSE server"
}
```

### `booking_created`
Sent when a new booking is created for the authenticated user's company.
```json
{
  "booking_id": "01GR...",
  "booking_number": "BK-1234",
  "customer_id": "cust_...",
  "service_id": "serv_...",
  "staff_id": "staff_..." || null,
  "scheduled_date": "2023-10-27T00:00:00.000Z",
  "scheduled_time_start": "10:00",
  "status": "pending",
  "created_at": "2023-10-26T14:30:00.000Z"
}
```

### `server_shutdown`
Sent when the server is shutting down. Clients should stop listening and potentially retry after a delay, or wait for manual reload.
```json
{
  "message": "Server shutting down"
}
```

## Client-Side Implementation (Frontend)

To connect using the standard `EventSource` API (Note: standard EventSource does not support headers, so you may need a polyfill like `event-source-polyfill` or pass the token via query parameter if we enable that).

**Using `event-source-polyfill` (Recommended for Auth Headers):**

```javascript
import { EventSourcePolyfill } from 'event-source-polyfill';

const connectSSE = (token) => {
  const eventSource = new EventSourcePolyfill(`${API_URL}/sse/events`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    heartbeatTimeout: 45000 // slightly higher than server heartbeat (30s)
  });

  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('Received generic message:', data);
  };

  eventSource.addEventListener('booking_created', (event) => {
    const booking = JSON.parse(event.data);
    console.log('New Booking Created:', booking);
    // Refresh booking list or add to state
    updateBookingList(booking);
  });
  
  eventSource.addEventListener('server_shutdown', (event) => {
    console.warn('Server shutting down');
    eventSource.close();
  });

  eventSource.onerror = (err) => {
    console.error('SSE Error:', err);
    // Polyfill usually handles reconnect, but you can add custom logic here
  };
  
  return eventSource;
};
```

## Heartbeat
The server sends a comment `: keep-alive` every 30 seconds to keep the connection open and prevent timeout by proxies/load balancers. Clients typically ignore this automatically.
