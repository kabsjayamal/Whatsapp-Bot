

import translate from 'translate'

async function translateText() {
    try {
        const text = await translate("how are you", {to: 'si'});
        console.log(text);
    } catch (error) {
        console.error("Translation error:", error);
    }
}

// Call the function to translate text
translateText();
