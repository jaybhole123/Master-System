import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, Share2, MessageCircle, Loader } from 'lucide-react';
import { toast } from 'react-hot-toast';
import useDataStore from '../../store/dataStore';
import { sendEmailViaGoogleSheets, logSharingActivity } from '../../utils/googleSheetsService';
import type { DocumentItem } from '../../store/dataStore';

interface ShareModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'email' | 'whatsapp' | 'both' | null;
    documentId: string | null;
    documentName: string;
    fileContent?: string;
    document?: DocumentItem;
    isBatch?: boolean;
    batchDocuments?: DocumentItem[];
    onSuccessShare?: (ids: string[]) => void;
}

const ShareModal: React.FC<ShareModalProps> = ({
    isOpen,
    onClose,
    type,
    documentId,
    documentName,
    fileContent,
    document,
    isBatch = false,
    batchDocuments = [],
    onSuccessShare
}) => {
    const [recipientName, setRecipientName] = useState('');
    const [email, setEmail] = useState('');
    const [whatsapp, setWhatsapp] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const { addShareHistory, shareHistory, documents } = useDataStore();

    // Add refs to track initial values
    const initialLoadRef = useRef(true);
    const prevIsOpenRef = useRef(isOpen);
    const prevDocumentNameRef = useRef(documentName);

    // Get document details if not provided directly
    const documentDetails = document || documents.find(d => d.id === documentId);

    useEffect(() => {
        // Only reset when modal opens, not when dependencies change
        if (isOpen && !prevIsOpenRef.current) {
            // Reset fields or prepopulate
            setRecipientName('');
            setEmail('');
            setWhatsapp('');

            // Only update subject if it's the initial load or documentName has actually changed
            const shouldUpdateSubject = initialLoadRef.current ||
                (documentName !== prevDocumentNameRef.current && !subject.trim());

            if (shouldUpdateSubject) {
                if (isBatch && batchDocuments.length > 0) {
                    setSubject(`Sharing ${batchDocuments.length} Documents`);
                    setMessage(`Please find the links for ${batchDocuments.length} shared documents. This link will expire in 7 days.`);
                } else {
                    setSubject(`Sharing Document: ${documentName}`);
                    setMessage(`Please find the link for the shared document: ${documentName}. This link will expire in 7 days.`);
                }
                prevDocumentNameRef.current = documentName;
            }

            setEmailSent(false);
            setIsSending(false);
            initialLoadRef.current = false;
        }

        prevIsOpenRef.current = isOpen;
    }, [isOpen]); // Only depend on isOpen

    const handleShareWhatsApp = (): void => {
        // Log the WhatsApp sharing activity with expiry
        if (isBatch && batchDocuments.length > 0) {
            batchDocuments.forEach((doc) => {
                logSharingActivity({
                    recipientName: recipientName,
                    documentName: doc.documentName,
                    documentType: doc.documentType,
                    category: doc.category,
                    serialNo: doc.sn,
                    fileContent: doc.fileContent,
                    shareMethod: 'WhatsApp',
                    number: whatsapp
                });
            });
        } else if (documentDetails) {
            logSharingActivity({
                recipientName: recipientName,
                documentName: documentName,
                documentType: documentDetails.documentType,
                category: documentDetails.category,
                serialNo: documentDetails.sn,
                fileContent: fileContent,
                shareMethod: 'WhatsApp',
                number: whatsapp
            });
        }

        // window.open(whatsappUrl, '_blank');
        toast.success("Document shared successfully on WhatsApp ✅");

        if (onSuccessShare) {
            if (isBatch && batchDocuments.length > 0) {
                onSuccessShare(batchDocuments.map(doc => doc.id));
            } else if (documentId) {
                onSuccessShare([documentId]);
            }
        }
    };

    if (!isOpen || !type) return null;



    function getSafeDriveLink(fileUrl: string) {

        if (!fileUrl) return "";

        const match = fileUrl.match(/[-\w]{25,}/);

        if (!match) return fileUrl;

        const fileId = match[0];

        const driveUrl = `https://drive.google.com/file/d/${fileId}/view`;

        // Encode to prevent Gmail preview
        return `https://www.google.com/url?q=${encodeURIComponent(driveUrl)}`;
    }
    const generateEmailBody = (): string => {
        let body = '';

        if (type === 'email' || type === 'both') {
            body += `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">`;

            if (isBatch && batchDocuments.length > 0) {
                // Batch email body
                body += `<h2 style="color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; margin-bottom: 20px;">
                    Shared ${batchDocuments.length} Documents
                </h2>`;

                batchDocuments.forEach((doc, index) => {
                    body += `<div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid #4f46e5;">`;
                    body += `<h3 style="margin-top: 0; color: #374151;">Document ${index + 1}: ${doc.documentName}</h3>`;
                    body += `<table style="width: 100%; border-collapse: collapse;">`;
                    if (doc.sn) body += `<tr><td style="padding: 6px 0; border-bottom: 1px solid #e5e7eb;"><strong>Serial No:</strong></td><td style="padding: 6px 0; border-bottom: 1px solid #e5e7eb;">${doc.sn}</td></tr>`;
                    if (doc.category) body += `<tr><td style="padding: 6px 0; border-bottom: 1px solid #e5e7eb;"><strong>Category:</strong></td><td style="padding: 6px 0; border-bottom: 1px solid #e5e7eb;">${doc.category}</td></tr>`;
                    if (doc.companyName) body += `<tr><td style="padding: 6px 0; border-bottom: 1px solid #e5e7eb;"><strong>Company:</strong></td><td style="padding: 6px 0; border-bottom: 1px solid #e5e7eb;">${doc.companyName}</td></tr>`;
                    if (doc.documentType) body += `<tr><td style="padding: 6px 0; border-bottom: 1px solid #e5e7eb;"><strong>Type:</strong></td><td style="padding: 6px 0; border-bottom: 1px solid #e5e7eb;">${doc.documentType}</td></tr>`;
                    if (doc.renewalDate) {
                        const date = new Date(doc.renewalDate);
                        body += `<tr><td style="padding: 6px 0;"><strong>Renewal Date:</strong></td><td style="padding: 6px 0;">${date instanceof Date && !isNaN(date.getTime()) ? date.toLocaleDateString() : doc.renewalDate}</td></tr>`;
                    }
                    body += `</table>`;

                    if (doc.fileContent) {
                        const safeUrl = getSafeDriveLink(doc.fileContent);
                        body += `
                        <div style="margin-top: 10px;">
                          <strong style="display: block; margin-bottom: 5px; color: #4b5563; font-size: 13px;">Document Link:</strong>
                          <a href="${safeUrl}" target="_blank" style="color: #2563eb; text-decoration: underline; word-break: break-all; font-size: 13px;">
                             ${safeUrl}
                          </a>
                        </div>`;
                    }
                    body += `</div>`;
                });
            } else {
                // Single document email body
                body += `<h2 style="color: #4f46e5; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; margin-bottom: 20px;">
                    Document Shared: ${documentName}
                </h2>`;

                if (documentDetails) {
                    body += `<div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin-bottom: 20px;">`;
                    body += `<h3 style="margin-top: 0; color: #374151;">Document Details:</h3>`;
                    body += `<table style="width: 100%; border-collapse: collapse;">`;
                    if (documentDetails.sn) body += `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Serial No:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${documentDetails.sn}</td></tr>`;
                    if (documentDetails.category) body += `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Category:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${documentDetails.category}</td></tr>`;
                    if (documentDetails.companyName) body += `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Company:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${documentDetails.companyName}</td></tr>`;
                    if (documentDetails.documentType) body += `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Type:</strong</td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${documentDetails.documentType}</td></tr>`;
                    if (documentDetails.renewalDate) {
                        const date = new Date(documentDetails.renewalDate);
                        body += `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;"><strong>Renewal Date:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">${date instanceof Date && !isNaN(date.getTime()) ? date.toLocaleDateString() : documentDetails.renewalDate}</td></tr>`;
                    }
                    body += `</table>`;
                    body += `</div>`;
                }

                if (fileContent) {
                    // Ensure preview link format (Google Drive)
                    const safeUrl = getSafeDriveLink(fileContent);

                    body += `
<div style="margin-top:15px;">
  <strong>Document Link:</strong><br>
  <a href="${safeUrl}" target="_blank"
     style="color:#2563eb; text-decoration:underline; word-break:break-all;">
     ${safeUrl}
  </a>
</div>
`;
                }
            }

            if (message) {
                body += `<div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; border-radius: 4px; margin-bottom: 20px;">`;
                body += `<p style="margin: 0; color: #0369a1;"><strong>Message:</strong> ${message}</p>`;
                body += `</div>`;
            }

            // Add expiry notice to email body
            body += `<div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 4px; margin-bottom: 20px;">`;
            body += `<p style="margin: 0; color: #92400e; font-size: 14px;">`;
            body += `<strong>⚠️ Important:</strong> This shared link will expire in 7 days (${new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}).`;
            body += `</p>`;
            body += `</div>`;

            body += `<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">`;
            body += `<p>This document was shared via Document Management System</p>`;
            body += `<p>Shared by: ${recipientName || 'System User'}</p>`;
            body += `</div>`;
            body += `</div>`;
        }

        return body;
    };


    const handleSendEmail = async (): Promise<boolean> => {
        if (!email.trim()) {
            toast.error('Please enter a valid email address');
            return false;
        }

        setIsSending(true);
        try {
            const emailBody = generateEmailBody();
            let emailSubject = subject;

            if (isBatch && batchDocuments.length > 0) {

                if (!emailSubject) {
                    emailSubject = `Sharing ${batchDocuments.length} Documents`;
                }

                const result = await sendEmailViaGoogleSheets({
                    to: email,
                    subject: emailSubject,
                    body: emailBody,
                    isHtml: true,
                    documentName: `${batchDocuments.length} Documents`,
                    recipientName: recipientName,
                    documentType: batchDocuments[0]?.documentType,
                    category: batchDocuments[0]?.category,
                    serialNo: batchDocuments[0]?.sn
                });

                if (result.success) {
                    setEmailSent(true);
                    toast.success(`Email with ${batchDocuments.length} documents sent successfully!`);
                    return true;
                } else {
                    toast.error(result.error || 'Failed to send email');
                    return false;
                }
            } else {
                // Single document
                if (!emailSubject) {
                    emailSubject = `Sharing Document: ${documentName}`;
                }

                const result = await sendEmailViaGoogleSheets({
                    to: email,
                    subject: emailSubject,
                    body: emailBody,
                    isHtml: true,
                    documentName: documentName,
                    recipientName: recipientName,
                    documentType: documentDetails?.documentType,
                    category: documentDetails?.category,
                    serialNo: documentDetails?.sn
                });

                if (result.success) {
                    setEmailSent(true);
                    toast.success('Email sent successfully!');
                    return true;
                } else {
                    toast.error(result.error || 'Failed to send email');
                    return false;
                }
            }
        } catch (error) {
            console.error('Email sending error:', error);
            toast.error('Failed to send email');
            return false;
        } finally {
            setIsSending(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();

        let emailSuccess = false;
        let whatsappOpened = false;

        // Handle email sending if applicable
        if (type === 'email' || type === 'both') {
            emailSuccess = await handleSendEmail();
            if (!emailSuccess && type === 'email') {
                return;
            }
        }

        // Handle WhatsApp if applicable
        if (type === 'whatsapp' || type === 'both') {
            handleShareWhatsApp();
            whatsappOpened = true;
        }

        // Add to share history
        if (emailSuccess || whatsappOpened || type === 'whatsapp') {
            const nextId = shareHistory.length + 1;

            if (isBatch && batchDocuments.length > 0) {
                // Add batch share history
                batchDocuments.forEach((doc, index) => {
                    if (type === 'email' || type === 'both') {
                        addShareHistory({
                            id: `share-${Date.now()}-${index}-email`,
                            shareNo: `SH-${String(nextId + index).padStart(3, '0')}`,
                            dateTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
                            docSerial: doc.sn || 'N/A',
                            docName: doc.documentName,
                            docFile: doc.fileContent || 'N/A',
                            sharedVia: 'Email',
                            recipientName: recipientName || 'N/A',
                            contactInfo: email
                        });
                    }

                    if (type === 'whatsapp' || type === 'both') {
                        addShareHistory({
                            id: `share-${Date.now()}-${index}-whatsapp`,
                            shareNo: `SH-${String(nextId + index + batchDocuments.length).padStart(3, '0')}`,
                            dateTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
                            docSerial: doc.sn || 'N/A',
                            docName: doc.documentName,
                            docFile: doc.fileContent || 'N/A',
                            sharedVia: 'WhatsApp',
                            recipientName: recipientName || 'N/A',
                            contactInfo: whatsapp
                        });
                    }
                });
            } else {
                // Single document share history
                if (type === 'both') {
                    addShareHistory({
                        id: `share-${Date.now()}-1`,
                        shareNo: `SH-${String(nextId).padStart(3, '0')}`,
                        dateTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
                        docSerial: documentDetails?.sn || 'N/A',
                        docName: documentName,
                        docFile: fileContent || 'N/A',
                        sharedVia: 'Email',
                        recipientName: recipientName || 'N/A',
                        contactInfo: email
                    });

                    addShareHistory({
                        id: `share-${Date.now()}-2`,
                        shareNo: `SH-${String(nextId + 1).padStart(3, '0')}`,
                        dateTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
                        docSerial: documentDetails?.sn || 'N/A',
                        docName: documentName,
                        docFile: fileContent || 'N/A',
                        sharedVia: 'WhatsApp',
                        recipientName: recipientName || 'N/A',
                        contactInfo: whatsapp
                    });
                } else {
                    addShareHistory({
                        id: `share-${Date.now()}`,
                        shareNo: `SH-${String(nextId).padStart(3, '0')}`,
                        dateTime: new Date().toISOString().slice(0, 16).replace('T', ' '),
                        docSerial: documentDetails?.sn || 'N/A',
                        docName: documentName,
                        docFile: fileContent || 'N/A',
                        sharedVia: type === 'email' ? 'Email' : 'WhatsApp',
                        recipientName: recipientName || 'N/A',
                        contactInfo: type === 'email' ? email : whatsapp
                    });
                }
            }

            // Close modal after successful sharing
            if ((type === 'email' && emailSuccess) || type === 'whatsapp' || (type === 'both' && (emailSuccess || whatsappOpened))) {
                setTimeout(() => {
                    onClose();
                    // Reset form
                    setRecipientName('');
                    setEmail('');
                    setWhatsapp('');
                    setEmailSent(false);
                    initialLoadRef.current = true; // Reset for next opening
                }, 1500);
            }
        }
    };

    const isEmail = type === 'email' || type === 'both';
    const isWhatsapp = type === 'whatsapp' || type === 'both';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-fade-in-up">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        {type === 'email' && <Mail className="text-blue-600" size={20} />}
                        {type === 'whatsapp' && <MessageCircle className="text-green-600" size={20} />}
                        {type === 'both' && <Share2 className="text-purple-600" size={20} />}
                        <h2 className="text-lg font-semibold text-gray-800">
                            {isBatch
                                ? `Share ${batchDocuments.length} Documents`
                                : type === 'email' ? 'Share via Email' :
                                    type === 'whatsapp' ? 'Share via WhatsApp' :
                                        'Share Options'}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isSending}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Document Selection (Read Only) */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                            {isBatch ? 'Documents' : 'Document'}
                        </label>
                        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg text-sm text-indigo-700 font-medium">
                            {isBatch ? (
                                <div>
                                    <p className="font-bold mb-2">Sharing {batchDocuments.length} documents:</p>
                                    <ul className="list-disc pl-5 space-y-1">
                                        {batchDocuments.map((doc, index) => (
                                            <li key={index} className="truncate">
                                                {index + 1}. {doc.documentName}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span>📄</span>
                                    {documentName}
                                </div>
                            )}
                        </div>
                        {!isBatch && fileContent && (
                            <p className="text-xs text-gray-500 mt-1">
                                Document details and download link will be shared
                            </p>
                        )}
                        {isBatch && batchDocuments.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                                Document links will be shared in the email
                            </p>
                        )}
                    </div>

                    {isEmail && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Recipient Name
                                </label>
                                <input
                                    type="text"
                                    required={isEmail}
                                    value={recipientName}
                                    onChange={(e) => setRecipientName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="Enter recipient name"
                                    disabled={isSending || emailSent}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    required={isEmail}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="john@example.com"
                                    disabled={isSending || emailSent}
                                />
                            </div>
                        </>
                    )}

                    {isWhatsapp && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                WhatsApp Number
                            </label>
                            <div className="flex">
                                <span className="inline-flex items-center px-3 border border-r-0 border-gray-200 bg-gray-50 rounded-l-lg text-gray-500 text-sm">
                                    +91
                                </span>
                                <input
                                    type="tel"
                                    required={isWhatsapp}
                                    value={whatsapp}
                                    onChange={(e) => setWhatsapp(e.target.value)}
                                    className="flex-1 w-full px-3 py-2 border border-gray-200 rounded-r-lg focus:ring-2 focus:ring-green-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="7222923078"
                                    disabled={isSending}
                                />
                            </div>
                        </div>
                    )}

                    {isEmail && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Subject
                                </label>
                                <input
                                    type="text"
                                    required={isEmail}
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="Enter email subject"
                                    disabled={isSending || emailSent}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                                    Message
                                </label>
                                <textarea
                                    rows={3}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all resize-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    placeholder="Add a message..."
                                    disabled={isSending || emailSent}
                                />
                            </div>
                        </>
                    )}

                    {/* Status Message */}
                    {emailSent && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-green-700">
                                <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                                    ✓
                                </div>
                                <span className="text-sm font-medium">
                                    {isBatch ? `Email with ${batchDocuments.length} documents sent successfully!` : 'Email sent successfully!'}
                                </span>
                            </div>
                            <p className="text-xs text-green-600 mt-1">
                                The shared link will expire in 7 days.
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSending}
                            className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSending || (isEmail && emailSent)}
                            className={`flex-1 px-4 py-2.5 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2
                                ${type === 'email' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : ''}
                                ${type === 'whatsapp' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : ''}
                                ${type === 'both' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : ''}
                                ${emailSent ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : ''}
                            `}
                        >
                            {isSending ? (
                                <>
                                    <Loader className="animate-spin" size={20} />
                                    Sending...
                                </>
                            ) : emailSent ? (
                                'Sent!'
                            ) : (
                                <>
                                    {type === 'email' && <Mail size={20} />}
                                    {type === 'whatsapp' && <MessageCircle size={20} />}
                                    {type === 'both' && <Share2 size={20} />}
                                    Share
                                    {type === 'email' && ' via Email'}
                                    {type === 'whatsapp' && ' via WhatsApp'}
                                    {type === 'both' && ' Options'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ShareModal;