import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; 
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service'; // <--- IMPORTAR SERVICIO
import { 
  Firestore, doc, getDoc, onSnapshot, collection, query, where, getCountFromServer 
} from '@angular/fire/firestore'; // <--- IMPORTAR getCountFromServer, query, where, collection
import { Router } from '@angular/router';

@Component({
  selector: 'app-chats',
  standalone: true,
  imports: [CommonModule, RouterModule], 
  templateUrl: './chats.html',
  styleUrls: ['./chats.css']
})
export class ChatsComponent implements OnInit {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private chatService = inject(ChatService); // <--- INYECTAR SERVICIO
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  chats: any[] = [];
  loading = true;
  currentUserUid: string | null = null;

  ngOnInit() {
    this.authService.user$.subscribe(user => {
      if (user) {
        this.currentUserUid = user.uid;
        this.loadChatsOptimized(user.uid);
      } else {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadChatsOptimized(uid: string) {
    this.loading = true;
    const userDocRef = doc(this.firestore, `users/${uid}`);
    
    onSnapshot(userDocRef, async (docSnap) => {
      if (!docSnap.exists()) {
        this.loading = false;
        this.cdr.detectChanges();
        return;
      }

      const data = docSnap.data();
      const friendIds = data['friends'] || []; 

      if (!Array.isArray(friendIds) || friendIds.length === 0) {
        this.chats = [];
        this.loading = false;
        this.cdr.detectChanges();
        return;
      }

      try {
        // 1. Carga paralela de perfiles básicos
        const requests = friendIds.map(fid => getDoc(doc(this.firestore, `users/${fid}`)));
        const snapshots = await Promise.all(requests);

        // 2. Mapeo inicial
        const tempChats = snapshots
          .filter(snap => snap.exists())
          .map(snap => {
            const fData = snap.data();
            return {
              id: snap.id,
              name: fData['name'] || 'Usuario',
              avatar: fData['avatar'] || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
              lastMessage: 'Haz clic para chatear...', 
              unreadCount: 0 // Empezamos en 0
            };
          });

        // 3. CALCULAR MENSAJES SIN LEER (Consulta Real)
        const chatPromises = tempChats.map(async (chat) => {
          if (!this.currentUserUid) return chat;

          // Obtenemos la ID de la sala
          const roomId = this.chatService.getChatRoomId(this.currentUserUid, chat.id);
          
          // Consultamos: Mensajes en esa sala, para MÍ, sin leer
          const msgsRef = collection(this.firestore, 'chats', roomId, 'messages');
          const q = query(
            msgsRef, 
            where('toUid', '==', this.currentUserUid),
            where('read', '==', false)
          );

          // getCountFromServer es muy rápido y barato
          const snapshot = await getCountFromServer(q);
          chat.unreadCount = snapshot.data().count;
          
          return chat;
        });

        // Esperamos a que se calculen todos los contadores
        this.chats = await Promise.all(chatPromises);

        // 4. Ordenar: Los que tienen mensajes sin leer primero
        this.chats.sort((a, b) => b.unreadCount - a.unreadCount);

      } catch (error) {
        console.error("Error cargando chats:", error);
      } finally {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openChat(friendId: string) {
    this.router.navigate(['/chat', friendId]);
  }
}