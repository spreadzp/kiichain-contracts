import EthCrypto from 'eth-crypto';
import CryptoJS from 'crypto-js';



export function encryptByCJ(message: string, secretKey: string) {
    const cipherText = CryptoJS.AES.encrypt(message, secretKey).toString();
    return cipherText
}

export function decryptByCJ(cipherText: string, secretKey: string) {
    const bytes = CryptoJS.AES.decrypt(cipherText, secretKey);
    const plaintext = bytes.toString(CryptoJS.enc.Utf8);
    return plaintext;
}

export function getNewAccount() {
    return EthCrypto.createIdentity();
}

