import {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    jidNormalizedUser,
    getContentType
} from '@adiwajshing/baileys'
import P from 'pino'
import fs from 'fs'
const prefix = '.'
const owner = ['94766866297']
import translate from 'translate';
import langdetect from 'langdetect';


async function connectToWA() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info_baileys')
    const conn = makeWASocket({
        logger: P({ level: 'silent' }),
        printQRInTerminal: true,
        generateHighQualityLinkPreview: true,
        auth: state,
    })

    conn.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        if (connection === 'close') {
            console.log('Connection closed. Last disconnect reason:', lastDisconnect.reason);
            if (lastDisconnect.error) {
                console.error('Last disconnect error:', lastDisconnect.error);
            }
    
            if (lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut) {
                console.log('Attempting to reconnect...');
                connectToWA();
            }
        } else if (connection === 'open') {
            console.log('Bot Connected ✅');
        }
    });
    conn.ev.on('creds.update', saveCreds)

    conn.ev.on('messages.upsert', async (mek) => {
        try {

            mek = mek.messages[0]
            if (!mek.message) return
            mek.message = (getContentType(mek.message) === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
            if (mek.key && mek.key.remoteJid === 'status@broadcast') return
            const type = getContentType(mek.message)
			const content = JSON.stringify(mek.message)
			const from = mek.key.remoteJid
			
			const quoted = type == 'extendedTextMessage' && mek.message.extendedTextMessage.contextInfo != null ? mek.message.extendedTextMessage.contextInfo.quotedMessage || [] : []
			const body = (type === 'conversation') ? mek.message.conversation : (type === 'extendedTextMessage') ? mek.message.extendedTextMessage.text : (type == 'imageMessage') && mek.message.imageMessage.caption ? mek.message.imageMessage.caption : ( type == 'listResponseMessage') && mek.message.listResponseMessage.singleSelectReply.selectedRowId? mek.message.listResponseMessage.singleSelectReply.selectedRowId : (type == 'buttonsResponseMessage') && mek.message.buttonsResponseMessage.selectedButtonId  ? mek.message.buttonsResponseMessage.selectedButtonId  : (type == "templateButtonReplyMessage") && mek.message.templateButtonReplyMessage.selectedId ? mek.message.templateButtonReplyMessage.selectedId  :  (type == 'videoMessage') && mek.message.videoMessage.caption ? mek.message.videoMessage.caption : ''
			
			const isCmd = body.startsWith(prefix)
			const command = isCmd ? body.slice(prefix.length).trim().split(' ').shift().toLowerCase() : ''
			
			const args = body.trim().split(/ +/).slice(1)
			const q = args.join(' ')
			const isGroup = from.endsWith('@g.us')
			const sender = mek.key.fromMe ? (conn.user.id.split(':')[0]+'@s.whatsapp.net' || conn.user.id) : (mek.key.participant || mek.key.remoteJid)
			const senderNumber = sender.split('@')[0]
			const botNumber = conn.user.id.split(':')[0]
			const pushname = mek.pushName || 'Sin Nombre'
			
			
			const isMe = botNumber.includes(senderNumber)
			const isOwner = owner.includes(senderNumber) || isMe
			
			const reply = (teks) => {
				conn.sendMessage(from, { text: teks }, { quoted: mek })
			}
            const groupMetadata = mek.isGroup ? await conn.groupMetadata(mek.chat).catch(e => {}) : ''
            const groupName = mek.isGroup ? groupMetadata.subject : ''
            const participants = mek.isGroup ? await groupMetadata.participants : ''
            const groupAdmins = mek.isGroup ? await participants.filter(v => v.admin !== null).map(v => v.id) : ''
            const groupOwner = mek.isGroup ? groupMetadata.owner : ''
    	    const isBotAdmins = mek.isGroup ? groupAdmins.includes(botNumber) : false
    	    const isAdmins = mek.isGroup ? groupAdmins.includes(mek.sender) : false
            let isEn = false;
            if (langdetect.detect(body) === null) {
                isEn = false
            }else {
                const detectedLanguage = langdetect.detect(body)[0].lang;
                isEn = (detectedLanguage === 'en') || (detectedLanguage === 'nl');
            }
            

            // Check if the detected language is Sinhala or English
            

            if (!(senderNumber == '94707344725') && !(senderNumber == '94777344725')) {
                conn.sendPresenceUpdate('composing', from) 
                const chatHistory = []
                const trt = await translate(body, {from: 'si'}, {to: 'en'})
            fetch('https://api.botsonic.ai/v1/botsonic/generate', {
                method: 'POST',
                headers: {
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                    'Content-Type': 'application/json',
                    'User-Agent': 'python-requests/2.28.1',
                    'accept': 'application/json',
                    'token': '05fb321d-21da-4aa6-9149-cb95bc0ac989'
                },
                body: JSON.stringify({
                    'input_text': trt,
                    'chat_id': '550e8400-e29b-41d4-a716-0' + senderNumber,
                    'chat_history': chatHistory
                })
            })
                .then(response => response.json())  // assuming the response is in JSON format
                .then(async data => {
                    const answer = await translate(data.answer, {to: 'si'})
                    conn.sendPresenceUpdate('available', from)
                    if (isEn){
                        reply(data.answer);
                     } else {
                        reply(answer);
                     }
                    chatHistory.push(data.chat_history)
                })
                .catch(error => console.error('Error:', error));
            
        }
    

            switch (command) {
                case 'jid':
                   reply(from)  ;                  break

                default:
                    if (isOwner && body.startsWith('>')) {
                        try {
                            await reply(util.format(await eval(`(async () => {${body.slice(1)}})()`)))
                        } catch(e) {
                            await reply(util.format(e))
                        }
                    }
            }
        } catch (e) {
            const isError = String(e)
            console.log(isError)
        }
    })
}

    connectToWA()
