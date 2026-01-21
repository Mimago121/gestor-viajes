import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core'; // <--- IMPORTAR ChangeDetectorRef
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router'; 
import { AuthService } from '../../services/auth.service';
import { Firestore, doc, getDoc, onSnapshot } from '@angular/fire/firestore';
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
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef); // <--- INYECTAR DETECTOR

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
        this.cdr.detectChanges(); // <--- ACTUALIZAR
      }
    });
  }

  loadChatsOptimized(uid: string) {
    this.loading = true;
    const userDocRef = doc(this.firestore, `users/${uid}`);
    
    // Escuchar cambios en tiempo real
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
        this.cdr.detectChanges(); // <--- ACTUALIZAR
        return;
      }

      try {
        // Carga paralela de perfiles
        const requests = friendIds.map(fid => getDoc(doc(this.firestore, `users/${fid}`)));
        const snapshots = await Promise.all(requests);

        this.chats = snapshots
          .filter(snap => snap.exists())
          .map(snap => {
            const fData = snap.data();
            return {
              id: snap.id,
              name: fData['name'] || 'Usuario',
              avatar: fData['avatar'] || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
              lastMessage: 'Haz clic para chatear...', 
              unread: false 
            };
          });

      } catch (error) {
        console.error("Error cargando chats:", error);
      } finally {
        this.loading = false;
        this.cdr.detectChanges(); // <--- ¡AQUÍ ESTÁ LA CLAVE! FORZAR PINTADO
      }
    });
  }

  openChat(friendId: string) {
    this.router.navigate(['/chat', friendId]);
  }
}