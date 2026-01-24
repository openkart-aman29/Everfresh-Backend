

import ejs from 'ejs';
import path from 'path';
import type { TemplateDataInterface } from '@/utilities/email/interfaces/Email_Interface';

export const renderTemplate = async (
  templateName: string,
  data: TemplateDataInterface
): Promise<string> => {
  /**
   * __dirname =
   * src/utilities/email/utility
   *
   * We want:
   * src/utilities/email/templates
   */
  const templatePath = path.resolve(
    __dirname,
    '..',        // email
    'templates', // templates
    `${templateName}.ejs`
  );


  return new Promise((resolve, reject) => {
    ejs.renderFile(templatePath, data, (err, html) => {
      if (err) {
        console.error('Template rendering error:', err);
        console.error('Attempted template path:', templatePath);
        reject(err);
      } else {
        resolve(html);
      }
    });
  });
};
