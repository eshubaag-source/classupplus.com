import dbConnect from './db';
import Admin from '@/models/Admin';
import Student from '@/models/Student';
import { NotificationLog } from '@/models/NotificationLog';

interface SendNotificationArgs {
  adminId: string;
  studentId: string;
  type: 'SMS' | 'WhatsApp' | 'Both';
  category: 'Attendance' | 'Fee' | 'VehicleFee' | 'Custom';
  message: string;
}

// Clean and format a phone number to E.164 format.
// Assumes +91 (India) prefix if it is a 10-digit number without country code.
function formatPhoneNumber(phone: string): string {
  // Strip all non-digit characters except maybe a leading '+'
  let cleaned = phone.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // If it's a 10-digit number, prepend +91
  if (cleaned.length === 10) {
    return `+91${cleaned}`;
  }

  // If it starts with 91 and is 12 digits, prepend +
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned}`;
  }

  // Return as is if we can't figure it out, but ensure it starts with '+' if it doesn't already
  return cleaned.startsWith('+') ? cleaned : `+${cleaned}`;
}

export async function sendNotification({
  adminId,
  studentId,
  type,
  category,
  message
}: SendNotificationArgs) {
  await dbConnect();

  try {
    // 1. Fetch admin settings
    const admin = await Admin.findById(adminId);
    if (!admin) {
      throw new Error('Admin not found');
    }

    // Prepend school name to the message
    message = `[${admin.schoolName}] ${message}`;

    // 2. Fetch student
    const student = await Student.findById(studentId);
    if (!student) {
      throw new Error('Student not found');
    }

    const rawContact = student.parentContact;
    if (!rawContact) {
      console.log(`[Notification Alert] No parent contact found for student: ${student.name}`);
      return { success: false, error: 'No contact number' };
    }

    const formattedContact = formatPhoneNumber(rawContact);

    const hasFast2SmsCreds = !!admin.fast2smsApiKey;

    const useSms = (type === 'SMS' || type === 'Both') && admin.smsEnabled !== false;
    const useWhatsapp = (type === 'WhatsApp' || type === 'Both') && admin.whatsappEnabled !== false;

    if (!useSms && !useWhatsapp) {
      console.log(`[Notification Skips] Both SMS and WhatsApp notifications are disabled for admin`);
      return { success: false, error: 'Notifications disabled' };
    }

    const results: any[] = [];
    const channelsToSend: ('SMS' | 'WhatsApp')[] = [];
    if (useSms) channelsToSend.push('SMS');
    if (useWhatsapp) channelsToSend.push('WhatsApp');

    for (const channel of channelsToSend) {
      if (hasFast2SmsCreds) {
        // Send real Fast2SMS message
        try {
          // Strip country code for Fast2SMS — it expects 10-digit mobile numbers
          const mobileNumber = formattedContact.replace(/^\+91/, '').replace(/^\+/, '');

          let res: Response;
          let data: any;

          if (channel === 'SMS') {
            // Fast2SMS bulkV2 — Quick SMS route
            res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
              method: 'POST',
              headers: {
                'Authorization': admin.fast2smsApiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                route: 'q',
                message,
                numbers: mobileNumber,
              }),
            });
            data = await res.json();
          } else {
            // Fast2SMS WhatsApp Business API
            // Requires a pre-approved template; message_id must be stored or configured
            const wabaPhoneId = admin.fast2smsWabaPhoneId;
            const wabaUrl = new URL('https://www.fast2sms.com/dev/whatsapp');
            wabaUrl.searchParams.set('message_id', '1'); // placeholder — admin should configure
            wabaUrl.searchParams.set('phone_number_id', wabaPhoneId);
            wabaUrl.searchParams.set('numbers', mobileNumber);
            wabaUrl.searchParams.set('variables_values', message);

            res = await fetch(wabaUrl.toString(), {
              method: 'GET',
              headers: { 'Authorization': admin.fast2smsApiKey },
            });
            data = await res.json();
          }

          if (res.ok && data.return === true) {
            // Log success to Database
            const log = new NotificationLog({
              adminId,
              studentId,
              recipient: formattedContact,
              type: channel,
              category,
              message,
              status: 'Sent'
            });
            await log.save();
            results.push({ channel, status: 'Sent', requestId: data.request_id });
          } else {
            // Log Fast2SMS API error
            const errorMsg = (data.message && (Array.isArray(data.message) ? data.message.join(', ') : data.message)) || `Fast2SMS error ${res.status}`;
            console.error(`[FAST2SMS ERROR] Channel: ${channel} | Error: ${errorMsg}`);

            const log = new NotificationLog({
              adminId,
              studentId,
              recipient: formattedContact,
              type: channel,
              category,
              message,
              status: 'Failed',
              error: errorMsg
            });
            await log.save();
            results.push({ channel, status: 'Failed', error: errorMsg });
          }
        } catch (f2sErr: any) {
          console.error(`[FAST2SMS CALL FAILED] Channel: ${channel} | Error: ${f2sErr.message}`);
          const log = new NotificationLog({
            adminId,
            studentId,
            recipient: formattedContact,
            type: channel,
            category,
            message,
            status: 'Failed',
            error: f2sErr.message
          });
          await log.save();
          results.push({ channel, status: 'Failed', error: f2sErr.message });
        }
      } else {
        // Simulation Mode: log and print console
        console.log(`[SIMULATED ${channel}] To: ${formattedContact} | Message: "${message}"`);

        const log = new NotificationLog({
          adminId,
          studentId,
          recipient: formattedContact,
          type: channel,
          category,
          message,
          status: 'Simulated'
        });
        await log.save();
        results.push({ channel, status: 'Simulated' });
      }
    }

    return { success: true, results };
  } catch (err: any) {
    console.error(`[NOTIFICATION HELPER ERROR] ${err.message}`);
    return { success: false, error: err.message };
  }
}
