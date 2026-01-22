import { Injectable, inject } from '@angular/core';
import { 
  Firestore, collection, addDoc, query, orderBy, onSnapshot, 
  doc, setDoc, limit 
} from '@angular/fire/firestore';

export interface ChatMessage {
  text: string;
  senderId: string;
  toUid: string;       // <--- NUEVO: Para saber a quién notificar
  read: boolean;       // <--- NUEVO: Para la burbujita roja
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
    const q = query(messagesRef, orderBy('createdAt', 'desc'), limit(50));

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as unknown as ChatMessage[];
      
      // Les damos la vuelta para el chat
      callback(messages.reverse());
    });
  }

  // --- MODIFICADO: AHORA PIDE 'receiverId' ---
  async sendMessage(roomId: string, text: string, senderId: string, receiverId: string) {
    try {
      const messagesRef = collection(this.firestore, `chats/${roomId}/messages`);
      
      // Guardamos datos clave para las notificaciones
      await addDoc(messagesRef, {
        text,
        senderId,
        toUid: receiverId,   // <--- IMPORTANTE
        read: false,         // <--- IMPORTANTE
        createdAt: Date.now()
      });

      // Actualizamos la fecha de última actividad y los participantes
      await setDoc(doc(this.firestore, `chats/${roomId}`), { 
        lastUpdate: Date.now(),
        users: [senderId, receiverId] // Guardamos quiénes están en el chat
      }, { merge: true });

    } catch (error) {
      console.error("Error enviando mensaje:", error);
    }
  }
}