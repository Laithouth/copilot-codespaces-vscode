// Minimal HTML templating with escaping by default.
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export class Raw {
  constructor(value) { this.value = String(value); }
  toString() { return this.value; }
}

export const raw = (value) => new Raw(value);

export function escape(value) {
  if (value === null || value === undefined || value === false) return '';
  if (value instanceof Raw) return value.value;
  if (Array.isArray(value)) return value.map(escape).join('');
  return String(value).replace(/[&<>"']/g, (c) => ESC[c]);
}

export function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0; i < values.length; i++) out += escape(values[i]) + strings[i + 1];
  return new Raw(out);
}

// Paragraphs from plain text: blank lines split paragraphs, text is escaped.
export function paras(text) {
  return raw(String(text || '').split(/\n{2,}/).map((p) => `<p>${escape(p).replace(/\n/g, '<br>')}</p>`).join(''));
}
