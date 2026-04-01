'use client';

import { useEffect, useRef } from 'react';

import type { ShippingBillOfLadingPdfPayload } from '../lib/shipping-pdf';

export type ShippingBillDocumentData = {
  blNumber: string;
  carrierBlNumber: string;
  slotCarrierBillNumber: string;
  bookingNumber: string;
  shipmentId: string;
  shipper: string;
  consignee: string;
  notifyParty: string;
  vessel: string;
  voyage: string;
  portOfLoading: string;
  portOfDischarge: string;
  placeOfReceipt: string;
  placeOfDelivery: string;
  shippedOnBoardDate: string;
  hsCode: string;
  marksAndNumbers: string;
  measurementCbm: string;
  tinNumber: string;
  tinAreaCode: string;
  numberOfOriginalBills: number;
  lcNumber: string;
  incoterm: string;
  freight: string;
  placeOfIssue: string;
  dateOfIssue: string;
  outputLabel: string;
  verifyHref?: string;
  containers: Array<{
    no: string;
    seal: string;
    packages: string;
    weight: string;
    description: string;
  }>;
};

function text(value: string | number | undefined) {
  return String(value || '');
}

function marksBlock(payload: ShippingBillOfLadingPdfPayload) {
  return [payload.marksAndNumbers, payload.containerNumber, payload.sealNumber].filter(Boolean).join('\n');
}

function titleText() {
  return 'BILL OF LADING FOR COMBINED TRANSPORT AND PORT TO PORT SHIPMENTS';
}

function originalLabel(payload: ShippingBillOfLadingPdfPayload) {
  if (payload.printVariant === 'copy') return 'COPY';
  if ((payload.outputLabel || '').includes('ORIGINAL 1 / ORIGINAL 2 / ORIGINAL 3')) return 'ORIGINAL 1';
  return payload.outputLabel || 'ORIGINAL';
}

function CopyWatermark() {
  return (
    <div className="bol-copy-watermark" aria-hidden="true">
      <svg viewBox="0 0 1000 1000" className="bol-copy-watermark-svg">
        <text x="500" y="560" textAnchor="middle" className="bol-copy-watermark-text">
          COPY
        </text>
      </svg>
    </div>
  );
}

export function ShippingBillDocument({
  pdfPayload,
}: {
  pdfPayload: ShippingBillOfLadingPdfPayload;
}) {
  const copyLabel = originalLabel(pdfPayload);
  const verifyUrl = pdfPayload.verifyUrl || `/shipping/bills-of-lading/verify?blNumber=${encodeURIComponent(pdfPayload.blNumber)}`;
  const pageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const content = page.querySelector('.bol-main-layout') as HTMLElement | null;
    if (!content) return;
    const hasLargeSpace = content.scrollHeight + 12 < content.clientHeight;
    page.classList.toggle('large-space', hasLargeSpace);
  }, [pdfPayload]);

  return (
    <div className="shipping-bl-document">
      <div className={`bol-page${pdfPayload.printVariant === 'copy' ? ' bol-page-copy' : ''}`} ref={pageRef}>
        {pdfPayload.printVariant === 'copy' ? <CopyWatermark /> : null}
        <div className="bol-title-cell">{titleText()}</div>
        <div className="bol-body">
          <div className="bol-side-rail">
            <div className="left-vertical-note bol-vertical-text">
              <span>
                Goods of dangerous or damaging nature must not be tendered for shipment unless written notice of their
                nature and the name and address of the sender have been previously given to the Carrier Master of Agent
                of he vessel and the nature is dis inctly marked on the outside of the pac! age or packages as required
                by statute under heavy penalties. A special stowage order giving consent to shipment must also be
                obtained from the Carrier, Master or Agent of the vessel shippers will be liable for all Consequential
                damage and expense if all the foregoing provisions are not complied with
              </span>
            </div>
          </div>
          <div className="bol-main-layout" id="bol-print">
            <table className="bol-table bol-header-table">
              <colgroup>
                <col style={{ width: '46%' }} />
                <col style={{ width: '32%' }} />
                <col style={{ width: '22%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <td className="bol-shipper-cell">
                    <div className="bol-label">Shipper</div>
                    <div className="bol-value bol-value-strong">{text(pdfPayload.shipper)}</div>
                  </td>
                  <td className="bol-reference-cell">
                    <div className="bol-ref-grid">
                      <div className="bol-ref-row">
                        <span className="bol-label">Shipper&apos;s Reference</span>
                        <strong>{text(pdfPayload.bookingReference)}</strong>
                      </div>
                      <div className="bol-ref-row">
                        <span className="bol-label">Carrier&apos;s Reference</span>
                        <strong>{text(pdfPayload.masterBlNumber)}</strong>
                      </div>
                      <div className="bol-ref-row">
                        <span className="bol-label">F/Agent Ref</span>
                        <strong>{text(pdfPayload.slotCarrierBillNumber)}</strong>
                      </div>
                    </div>
                  </td>
                  <td className="bol-number-cell">
                    <div className="bol-pages-box">
                      <div className="bol-label">Pages</div>
                      <div className="bol-value bol-value-strong">1</div>
                    </div>
                    <div className="bol-label">Bill of Lading Number</div>
                    <div className="bol-value bol-value-strong">{text(pdfPayload.blNumber)}</div>
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="bol-booking-cell">
                    <span className="bol-label">Booking Reference No.</span>
                    <strong>{text(pdfPayload.bookingReference)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>

            <table className="bol-table bol-party-table">
              <colgroup>
                <col style={{ width: '46%' }} />
                <col style={{ width: '54%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <td className="bol-party-cell">
                    <div className="bol-label">Consignee</div>
                    <div className="bol-value bol-value-strong">{text(pdfPayload.consignee)}</div>
                  </td>
                  <td className="bol-logo-cell" rowSpan={2}>
                    <div className="bol-logo-panel">
                      <div className="bol-logo-wrap">
                        <img src="/branding/tikur-abay-logo.png" alt="Tikur Abay logo" className="bol-logo" />
                        <div className="bol-logo-copy bol-logo-copy-small">Tikur Abay Transport and Logistics</div>
                        <div className="bol-logo-copy bol-logo-copy-amharic-small">ቲኩር አባይ ትራንስፖርት እና ሎጂስቲክስ</div>
                        <div className="bol-logo-copy bol-logo-copy-amharic">ቲኩር አባይ ትራንስፖርት እና ሎጂስቲክስ ኃ/የተ/የግ/ማህበር</div>
                        <div className="bol-logo-copy bol-logo-copy-native">TIKUR ABAY TRANSPORT &amp; LOGISTICS PLC</div>
                        <div className="bol-logo-copy bol-logo-copy-amharic-small">አዲስ አበባ</div>
                        <div className="bol-logo-copy">ADDIS ABABA</div>
                      </div>
                      <div className="bol-original-holder">
                        <div className="bol-original-box">{copyLabel}</div>
                      </div>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="bol-party-cell">
                    <div className="bol-label">Notify Party</div>
                    <div className="bol-value bol-value-strong">{text(pdfPayload.notifyParty)}</div>
                  </td>
                </tr>
              </tbody>
            </table>

            <table className="bol-table bol-transport-table">
              <tbody>
                <tr>
                  <td><div className="bol-label">Pre-Carriage By</div><div className="bol-value">{text(pdfPayload.placeOfReceipt)}</div></td>
                  <td><div className="bol-label">Place of Receipt by pre-carrier</div><div className="bol-value">{text(pdfPayload.placeOfReceipt)}</div></td>
                  <td><div className="bol-label">Port of Loading</div><div className="bol-value">{text(pdfPayload.portOfLoading)}</div></td>
                  <td><div className="bol-label">Port of Discharge</div><div className="bol-value">{text(pdfPayload.portOfDischarge)}</div></td>
                </tr>
                <tr>
                  <td><div className="bol-label">Vessel</div><div className="bol-value">{text(pdfPayload.vessel)}</div></td>
                  <td><div className="bol-label">Voyage No</div><div className="bol-value">{text(pdfPayload.voyage)}</div></td>
                  <td><div className="bol-label">Place of Delivery</div><div className="bol-value">{text(pdfPayload.placeOfDelivery)}</div></td>
                  <td><div className="bol-label">On Carriage Payable at</div><div className="bol-value">{text(pdfPayload.placeOfIssue)}</div></td>
                </tr>
              </tbody>
            </table>

            <table className="bl-goods">
              <colgroup>
                <col style={{ width: '22%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '39%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
              </colgroup>
              <tbody>
                <tr className="goods-title-row">
                  <th colSpan={5}>PARTICULARS OF GOODS ARE THOSE DECLARED BY SHIPPER</th>
                </tr>
                <tr className="goods-head-row">
                  <th>Marks and Nos. Container no/seal no</th>
                  <th>Kind &amp; No of Packages</th>
                  <th>Description of Goods</th>
                  <th>Gross Weight (Kg)</th>
                  <th>Measurements (m&sup3;)</th>
                </tr>
                <tr className="goods-body-row">
                  <td>{marksBlock(pdfPayload)}</td>
                  <td>{text(pdfPayload.packages)}</td>
                  <td>{text(pdfPayload.cargoDescription)}</td>
                  <td>{text(pdfPayload.weight)}</td>
                  <td>{text(pdfPayload.measurementCbm)}</td>
                </tr>
              </tbody>
            </table>

            <table className="bl-summary">
              <colgroup>
                <col style={{ width: '25%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '25%' }} />
                <col style={{ width: '25%' }} />
              </colgroup>
              <tbody>
                <tr>
                  <td colSpan={2}>
                    <div className="label">Total No of Containers</div>
                    <div className="value">1</div>
                  </td>
                  <td colSpan={2}>
                    <div className="label">Total no Packages</div>
                    <div className="value">{text(pdfPayload.packages)}</div>
                  </td>
                </tr>
                <tr>
                  <td>
                    <div className="label">No. of original Bills of Lading</div>
                    <div className="value">{text(pdfPayload.numberOfOriginalBills)}</div>
                  </td>
                  <td>
                    <div className="label">Slot carrier bill no</div>
                    <div className="value">{text(pdfPayload.slotCarrierBillNumber)}</div>
                  </td>
                  <td>
                    <div className="label">Payable at</div>
                    <div className="value">{text(pdfPayload.placeOfIssue)}</div>
                  </td>
                  <td>
                    <div className="label">Shipped on Board Date</div>
                    <div className="value">{text(pdfPayload.shippedOnBoardDate)}</div>
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="legal-text-cell">
                    <p>
                      Received, in apparent good order and condition unless otherwise stated, the goods or containers
                      or other packages said to contain goods herein mentioned to be transported subject always to the
                      exceptions, limitations, provisions, conditions and liberties contained herein and whether
                      written, printed or stamped on the front or reverse hereof, from the place of receipt or the
                      port of loading, whichever applicable, to the port of discharge or the place of delivery,
                      whichever applicable. All agreements or freight engagements for shipment of the goods are
                      superseded by this Bill of Lading.
                    </p>
                    <p className="bol-legal-tail">
                      In witness whereof the Master or Agents have affirmed to the number of original Bills of Lading,
                      one of which being accomplished, the other(s) to be void.
                    </p>
                  </td>
                  <td className="freight-cell">
                    <div><strong>Freight:</strong> {text(pdfPayload.freightTerm).toUpperCase()}</div>
                    <div><strong>Incoterm:</strong> {text(pdfPayload.incoterm)}</div>
                    <div><strong>HS Code:</strong> {text(pdfPayload.hsCode)}</div>
                    <div><strong>TIN:</strong> {text(pdfPayload.tinNumber)}</div>
                    <div><strong>LC / Bank Ref:</strong> {text(pdfPayload.lcNumber)}</div>
                    <div><strong>Payable at:</strong> {text(pdfPayload.placeOfIssue)}</div>
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} className="signature-cell">
                    <table className="bol-signature-table">
                      <tbody>
                        <tr>
                          <td className="bol-signature-image-cell">
                            <img src="/branding/tikur-abay-stamp.svg" alt="Official stamp" className="bol-stamp" />
                          </td>
                          <td className="bol-signature-image-cell">
                            <img src="/branding/tikur-abay-signature.svg" alt="Carrier signature" className="bol-sign-mark" />
                          </td>
                        </tr>
                        <tr>
                          <td>(AS AGENT)</td>
                          <td>for the carrier</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="bol-date-block">
                      <span className="bol-label">Date of Issue</span>
                      <strong>{text(pdfPayload.issueDate)}</strong>
                    </div>
                  </td>
                  <td className="qr-cell">
                    <div className="bol-original-box bol-original-box--footer">{copyLabel}</div>
                    <img src={`/api/qr?data=${encodeURIComponent(verifyUrl)}`} alt="BL QR" className="bol-qr" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
