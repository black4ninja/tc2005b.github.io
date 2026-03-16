import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templatesPath = path.join(__dirname, '..', 'templates');

function loadTemplate(templateName: string): string {
  const templatePath = path.join(templatesPath, `${templateName}.html`);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${templateName}.html`);
  }

  return fs.readFileSync(templatePath, 'utf-8');
}

function substituteVariables(template: string, variables: Record<string, string | number>): string {
  return template.replace(/\{\{([A-ZÁÉÍÓÚÑ_0-9]+)\}\}/gi, (match, key: string) => {
    if (key in variables) {
      const value = variables[key];
      return value !== null && value !== undefined ? String(value) : '';
    }
    const upperKey = key.toUpperCase();
    if (upperKey in variables) {
      const value = variables[upperKey];
      return value !== null && value !== undefined ? String(value) : '';
    }
    return match;
  });
}

export function getCommonVariables(): Record<string, string | number> {
  return {
    AÑO: new Date().getFullYear(),
    NOMBRE_CURSO: 'TC2005B',
    EMAIL_CONTACTO: process.env.EMAIL_FROM || 'no_reply@meeplab.com',
  };
}

export function render(templateName: string, variables: Record<string, string | number>): string {
  const template = loadTemplate(templateName);
  return substituteVariables(template, variables);
}
