const storage = require('@google-cloud/storage')();
const admin = require('firebase-admin');

const serviceAccount = require('../lighthouse-keeper-firebase-adminsdk-4m2x8-eb75f703d2.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "lighthouse-keeper.appspot.com"
});

const bucket = admin.storage().bucket();

async function uploadFile(filename) {
    const matches = filename.match(/\/([^\/]+_(\d{4}-\d{2}-\d{2})\.(mobile|desktop)\.json)$/);
    const uploadOptions = {
        destination: `${matches[2]}/${matches[1]}`,
    };
    const uploadedFile = await bucket.upload(filename, uploadOptions);
    await uploadedFile.forEach(async (file) => {
        await file.acl.add({
            entity: 'AllUsers',
            role: storage.acl.READER_ROLE,
        });
    });
    
    return uploadedFile[0].metadata.mediaLink;
}

module.exports = {
    uploadFile
};