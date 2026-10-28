import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Universal drop-in helper compatible with html2pdf() syntax:
 * html2pdf().set(opt).from(element).save()
 * html2pdf().set(opt).from(element).toPdf().get('pdf').then(...).save()
 */
class Html2PdfWrapper {
  constructor() {
    this.opt = {
      margin: 0.2,
      filename: 'document.pdf',
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    this.element = null;
    this.pdfInstance = null;
  }

  set(opt = {}) {
    this.opt = {
      ...this.opt,
      ...opt,
      html2canvas: { ...this.opt.html2canvas, ...(opt.html2canvas || {}) },
      jsPDF: { ...this.opt.jsPDF, ...(opt.jsPDF || {}) }
    };
    return this;
  }

  from(element) {
    this.element = element;
    return this;
  }

  async _render() {
    if (!this.element) return null;
    const canvas = await html2canvas(this.element, {
      scale: this.opt.html2canvas?.scale || 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const orientation = this.opt.jsPDF?.orientation || 'portrait';
    const format = this.opt.jsPDF?.format || 'a4';
    const pdf = new jsPDF(orientation === 'landscape' ? 'l' : 'p', 'pt', format);

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const marginPt = (typeof this.opt.margin === 'number' ? this.opt.margin : 0.2) * 72;
    const availableWidth = pdfWidth - (marginPt * 2);
    const availableHeight = pdfHeight - (marginPt * 2);

    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);

    const printWidth = imgWidth * ratio;
    const printHeight = imgHeight * ratio;
    const x = (pdfWidth - printWidth) / 2;
    const y = marginPt;

    const imgData = canvas.toDataURL(this.opt.image?.type === 'png' ? 'image/png' : 'image/jpeg', this.opt.image?.quality || 0.95);
    pdf.addImage(imgData, 'JPEG', x, y, printWidth, printHeight);

    this.pdfInstance = pdf;
    return pdf;
  }

  toPdf() {
    const self = this;
    const promise = this._render();
    return {
      get(type) {
        return {
          then(callback) {
            return {
              save() {
                return promise.then((pdf) => {
                  if (type === 'pdf' && callback) callback(pdf);
                  pdf.save(self.opt.filename || 'document.pdf');
                });
              }
            };
          }
        };
      },
      save() {
        return promise.then(pdf => {
          pdf.save(self.opt.filename || 'document.pdf');
        });
      }
    };
  }

  async save() {
    const pdf = await this._render();
    if (pdf) {
      pdf.save(this.opt.filename || 'document.pdf');
    }
  }
}

export default function html2pdf() {
  return new Html2PdfWrapper();
}
