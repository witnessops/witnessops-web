import { createHash } from 'node:crypto';
import type { TextEmailPayload } from '../../../witnessops-web/src/lib/server/send-verification-email';
import { reportTitle, type RecipientReport } from './share-projection';
export const messageDigest = (message: TextEmailPayload) => createHash('sha256').update(JSON.stringify(message)).digest('hex');
/** No caller-supplied URL or HTML. The origin comes from the server's app configuration. */
export function reportEmail(origin: string, token: string, recipient: string, snapshot: RecipientReport, expires: Date, id: string, passwordProtected=false): TextEmailPayload {
 const base = new URL(origin);
 if (base.origin !== origin || base.username || base.password || !['https:','http:'].includes(base.protocol)) throw new Error('Invalid app origin');
 const title = reportTitle(snapshot);
 return {from:'WitnessOps Reports <reports@send.witnessops.com>',replyTo:'engage@mail.witnessops.com',to:recipient,
  subject:'A WitnessOps report was shared with you',
  text:`A workspace Owner shared a WitnessOps report with you.\n\n${title}\nPublisher-supplied report name, not a verification claim.\n\nA fixed report revision, available until ${expires.toISOString()}.\n\nView report:\n${origin}/s#${token}\n\n${passwordProtected ? 'This report requires both this link and a separate password. Ask the sender for the password through a different channel.' : 'Anyone with this link can access it. Please forward deliberately.'} Access may be revoked sooner; downloaded copies cannot be recalled.`,
  signatureProfile:'none',deliveryAttemptId:id};
}
