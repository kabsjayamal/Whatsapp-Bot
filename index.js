const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    jidNormalizedUser,
    getContentType
} = require('@adiwajshing/baileys')
const P = require('pino')
const fs = require('fs')
const prefix = '.'
const owner = ['94766866297']
const axios = require('axios');
const cheerio = require('cheerio');
const url = 'https://cjtedu.com';

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

            
            switch (command) {
                case 'dhamma':
                    function sendData() {	
                        axios.get(url)
                          .then(response => {
                            const $ = cheerio.load(response.data);
                            const latestArticleLink = $('div > div > div.pad.read-details.color-tp-pad > div.read-title > h4 > a').attr('href');
                        
                            axios.get("https://cjtedu.com/archives/1700")
                              .then(response => {
                                const $ = cheerio.load(response.data);
                                const title = $('div.entry-content-wrap.read-single > div.entry-content-title-featured-wrap > header > div > div > h1').text().trim();
                                const description = $('.read-details p').map((i, el) => $(el).text().trim()).get().join('\n\n');
                                const img = $('.read-details img').attr('src');
                                const imageLinks = []
                        
                                $('.post-body img').each(function () {
                                    imageLinks.push($(this).attr('src'));
                                  });
                                  console.log(latestArticleLink, title, description, img);
                                  async function message(){
                                    await conn.sendMessage("120363225924520943@g.us", { image: { url: img }, caption: '*' + title + '*\n\n' + description});  
                                  };
                                  message();
                                  
                            
                              })
                              .catch(error => {
                                console.error(error);
                              });
                          })}
                          sendData();
                    break
                case 'jid':
                    reply(from)
                    break

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
