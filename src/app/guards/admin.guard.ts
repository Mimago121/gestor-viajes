import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';

export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const auth = inject(Auth);
  const firestore = inject(Firestore);

  console.log("🛡️ [GUARD] Verificando acceso Admin...");

  return new Promise<boolean>((resolve) => {
    // Timeout de seguridad: Si en 3 segundos no carga, te echa.
    const timeout = setTimeout(() => {
      console.error("🛡️ [GUARD] ⏱️ Tiempo de espera agotado. Firestore no responde.");
      router.navigate(['/trips']);
      resolve(false);
    }, 3000);

    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        clearTimeout(timeout);
        console.log("🛡️ [GUARD] ❌ No user. Al Login.");
        router.navigate(['/login']);
        resolve(false);
        return;
      }

      try {
        const docRef = doc(firestore, `users/${user.uid}`);
        const snapshot = await getDoc(docRef);

        clearTimeout(timeout); // Cancelamos el timeout porque ya respondió

        if (snapshot.exists() && snapshot.data()['role'] === 'admin') {
          console.log("🛡️ [GUARD] ✅ Acceso permitido.");
          resolve(true);
        } else {
          console.log("🛡️ [GUARD] ⛔ Acceso denegado (No es admin).");
          router.navigate(['/trips']);
          resolve(false);
        }
      } catch (error) {
        clearTimeout(timeout);
        console.error("🛡️ [GUARD] 💥 Error:", error);
        router.navigate(['/trips']);
        resolve(false);
      }
    });
  });
};