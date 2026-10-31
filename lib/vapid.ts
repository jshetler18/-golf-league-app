import {createECDH} from 'node:crypto'

export function getVapidPublicKey(){
  const privateKey=process.env.VAPID_PRIVATE_KEY
  if(!privateKey)throw new Error('VAPID private key not configured')
  const ecdh=createECDH('prime256v1')
  ecdh.setPrivateKey(Buffer.from(privateKey,'base64url'))
  return ecdh.getPublicKey('base64url','uncompressed')
}
