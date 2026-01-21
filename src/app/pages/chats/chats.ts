import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; // <--- IMPORTANTE: Para usar routerLink
import { AuthService } from '../../services/auth.service';
import { Firestore, doc, getDoc, onSnapshot } from '@angular/fire/firestore';
import { Router } from '@angular/router';

@Component({
  selector: 'app-chats',
  standalone: true,
  imports: [CommonModule, RouterModule], // <--- AÑADIR AQUÍ
  templateUrl: './chats.html',
  styleUrls: ['./chats.css']
})
export class ChatsComponent implements OnInit {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);
  private router = inject(Router);

  chats: any[] = [];
  loading = true;
  currentUserUid: string | null = null;

  ngOnInit() {
    this.authService.user$.subscribe(user => {
      if (user) {
        this.currentUserUid = user.uid;
        this.loadChats(user.uid);
      } else {
        this.loading = false;
      }
    });
  }

  loadChats(uid: string) {
    const userDocRef = doc(this.firestore, `users/${uid}`);
    
    onSnapshot(userDocRef, async (docSnap) => {
      if (docSnap.exists()) {
        const friendIds = docSnap.data()['friends'] || [];
        this.chats = []; 

        if (friendIds.length === 0) {
          this.loading = false;
          return;
        }

        // Cargamos info de cada amigo
        const loadedChats = [];
        for (const friendId of friendIds) {
          const fDoc = await getDoc(doc(this.firestore, `users/${friendId}`));
          if (fDoc.exists()) {
            const fData = fDoc.data();
            loadedChats.push({
              id: friendId,
              name: fData['name'],
              avatar: fData['avatar'] || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
              lastMessage: 'Haz clic para chatear...', 
              unread: false 
            });
          }
        }
        this.chats = loadedChats;
        this.loading = false;
      }
    });
  }

  openChat(friendId: string) {
    alert(`Abriendo chat con ${friendId}`);
    // Aquí redirigirías a la sala de chat real
  }
}