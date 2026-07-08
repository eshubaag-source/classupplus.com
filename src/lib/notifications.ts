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

    const hasTwilioCreds =
      admin.twilioAccountSid &&
      admin.twilioAuthToken &&
      ((type === 'SMS' || type === 'Both') ? admin.twilioSmsNumber : true) &&
      ((type === 'WhatsApp' || type === 'Both') ? admin.twilioWhatsappNumber : true);

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
      if (hasTwilioCreds) {
        // Send real Twilio message
        try {
          const accountSid = admin.twilioAccountSid;
          const authToken = admin.twilioAuthToken;
          
          let fromNumber = '';
          let toNumber = formattedContact;

          if (channel === 'SMS') {
            fromNumber = admin.twilioSmsNumber;
          } else {
            fromNumber = `whatsapp:${admin.twilioWhatsappNumber}`;
            toNumber = `whatsapp:${formattedContact}`;
          }

          const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
          const basicAuth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

          // Encode parameters as application/x-www-form-urlencoded
          const params = new URLSearchParams();
          params.append('To', toNumber);
          params.append('From', fromNumber);
          params.append('Body', message);

          const res = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${basicAuth}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
          });

          const data = await res.json();

          if (res.ok) {
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
            results.push({ channel, status: 'Sent', sid: data.sid });
          } else {
            // Log Twilio API error
            const errorMsg = data.message || `Twilio error ${res.status}`;
            console.error(`[TWILIO ERROR] Channel: ${channel} | Error: ${errorMsg}`);
            
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
        } catch (twilioErr: any) {
          console.error(`[TWILIO CALL FAILED] Channel: ${channel} | Error: ${twilioErr.message}`);
          const log = new NotificationLog({
            adminId,
            studentId,
            recipient: formattedContact,
            type: channel,
            category,
            message,
            status: 'Failed',
            error: twilioErr.message
          });
          await log.save();
          results.push({ channel, status: 'Failed', error: twilioErr.message });
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
