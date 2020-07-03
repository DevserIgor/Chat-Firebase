/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// Note: You will edit this file in the follow up codelab about the Cloud Functions for Firebase.

//import firebase SDK para  google clound functions o que permite escrever os codigos
const functions = require('firebase-functions');
const admin = require('firebase-admin');

//importa e inicializa o firebase admin que permite autorizações de clound functions

admin.initializeApp();
const firestore = admin.firestore();


exports.onUserStatusChanged = functions.database.ref('/status/{uid}').onUpdate(
    async (change, context) => {      
      //pega os dados do database RT
      //const eventStatus = change.after.val(); 
      
      //referencia o usuario no document equivalente ao id  

      const userStatusFirestoreRef = firestore.doc(`users/${context.params.uid}`);
      console.log(context.params.uid);
      const statusSnapshot = await change.after.ref.once('value');
      const status = statusSnapshot.val();

      //se data atual for mais recente 
      if (status === "Offline") {
        return userStatusFirestoreRef.set({
          online: false,
        },{merge:true});        
      }
      console.log("teste");
      return 0;
  });

//Adiciona mensagens de bem-vindo á novos usuarios no cha
exports.addWelcomeMessages = functions.auth.user().onCreate(async (user) => {  
  // var email = capitalize(user.email.split("@")[0]);  
  // const fullName = email || 'Anonymous';

  // salva a mensagem de bem vindo  
  // await admin.firestore().collection('messages').add({
  //   name: 'Firebase Bot',
  //   profilePicUrl: '/images/firebase-logo.png', // Firebase logo
  //   text: `${fullName} entrou pela primeira vez no chat teste, seja bem vindo!`,
  //   timestamp: admin.firestore.FieldValue.serverTimestamp(),
  // });  
});


// envia notificações a todos usuarios
exports.sendNotifications = functions.firestore.document('messages/{messageId}').onCreate(
  async (snapshot) => {
    // Notification details.
    const text = snapshot.data().text;
    const payload = {
      notification: {
        title: `${snapshot.data().name} posted ${text ? 'a message' : 'an image'}`,
        body: text ? (text.length <= 100 ? text : text.substring(0, 97) + '...') : '',
        icon: snapshot.data().profilePicUrl || '/images/profile_placeholder.png',
        click_action: `https://${process.env.GCLOUD_PROJECT}.firebaseapp.com`,
      }
    };

    // Get the list of device tokens.
    const allTokens = await admin.firestore().collection('fcmTokens').get();
    const tokens = [];
    allTokens.forEach((tokenDoc) => {
      tokens.push(tokenDoc.id);
    });

    if (tokens.length > 0) {
      // Send notifications to all tokens.
      const response = await admin.messaging().sendToDevice(tokens, payload);
      await cleanupTokens(response, tokens);
      console.log('Notifications have been sent and tokens cleaned up.');
    }
  });


  // Cleans up the tokens that are no longer valid.
function cleanupTokens(response, tokens) {
  // For each notification we check if there was an error.
  const tokensDelete = [];
  response.results.forEach((result, index) => {
    const error = result.error;
    if (error) {
      console.error('Failure sending notification to', tokens[index], error);
      // Cleanup the tokens who are not registered anymore.
      if (error.code === 'messaging/invalid-registration-token' ||
          error.code === 'messaging/registration-token-not-registered') {
        const deleteTask = admin.firestore().collection('fcmTokens').doc(tokens[index]).delete();
        tokensDelete.push(deleteTask);
      }
    }
  });
  return Promise.all(tokensDelete);
 }

 
