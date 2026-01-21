import { Injectable, inject } from '@angular/core';
import { 
  Firestore, collection, addDoc, query, orderBy, onSnapshot, 
  doc, setDoc, limit // <--- IMPORTANTE: AÑADIR LIMIT
} from '@angular/fire/firestore';

export interface ChatMessage {
  text: string;
  senderId: string;
  createdAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private firestore = inject(Firestore);

  // Genera un ID único para la sala
  getChatRoomId(uid1: string, uid2: string): string {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
  }

  // Escuchar mensajes (OPTIMIZADO)
  getMessages(roomId: string, callback: (msgs: ChatMessage[]) => void) {
    const messagesRef = collection(this.firestore, `chats/${roomId}/messages`);
    
    // TRUCO DE VELOCIDAD:
    // 1. Ordenamos por 'desc' (lo más nuevo primero).
    // 2. Pedimos solo los últimos 50.
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(50));

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => doc.data() as ChatMessage);
      
      // 3. Como vienen "del revés" (el más nuevo primero), les damos la vuelta
      // para que en el chat el último mensaje salga abajo del todo.
      callback(messages.reverse());
    });
  }

  // Enviar mensaje
  async sendMessage(roomId: string, text: string, senderId: string) {
    const messagesRef = collection(this.firestore, `chats/${roomId}/messages`);
    await addDoc(messagesRef, {
      text,
      senderId,
      createdAt: Date.now()
    });

    // Actualizamos la fecha de última actividad del chat
    await setDoc(doc(this.firestore, `chats/${roomId}`), { lastUpdate: Date.now() }, { merge: true });
  }
}