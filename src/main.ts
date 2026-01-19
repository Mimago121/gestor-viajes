import 'zone.js';
// Tus imports de Bootstrap (están bien, déjalos)
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import 'bootstrap/dist/css/bootstrap.min.css';

import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app';
// IMPORTANTE: Importamos la configuración que creamos antes
import { appConfig } from './app/app.config'; 

// Le pasamos appConfig aquí para que cargue Firebase y las rutas
bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));