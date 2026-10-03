import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpHandlerFn
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { ConfigService } from '../services/config.service';

@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {
  private isAlertOpen = false;

  constructor(
    private alertController: AlertController,
    private configService: ConfigService,
    private router: Router
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        this.handleError(req, error);
        return throwError(() => error);
      })
    );
  }

  private async handleError(req: HttpRequest<any>, error: HttpErrorResponse): Promise<void> {
    console.error('HttpErrorInterceptor detectó un error:', error);

    // Evitar acumular múltiples alertas en pantalla simultáneamente
    if (this.isAlertOpen) {
      return;
    }

    const currentIp = this.configService.getCurrentIp();
    const isOffline = !navigator.onLine;

    // Sanitizar payload para ocultar contraseñas en logs/alertas si existen
    const safePayload = this.sanitizePayload(req.body);
    const payloadStr = safePayload ? JSON.stringify(safePayload, null, 2) : '(Sin cuerpo)';

    let errorDetail = '';
    if (error.status === 0) {
      errorDetail = isOffline
        ? 'El dispositivo no tiene conexión a Internet activa (navigator.onLine = false).'
        : `No se pudo establecer conexión con el servidor XAMPP (${currentIp}). Verifica que Apache esté encendido y que el firewall permita tráfico en el puerto configurado.`;
    } else {
      errorDetail = typeof error.error === 'string'
        ? error.error
        : (error.error ? JSON.stringify(error.error, null, 2) : error.message);
    }

    const diagnosticReport = {
      timestamp: new Date().toISOString(),
      serverIp: currentIp,
      method: req.method,
      url: req.urlWithParams || req.url,
      httpStatus: error.status,
      statusText: error.statusText || (error.status === 0 ? 'CONNECTION_REFUSED / NETWORK_ERROR' : ''),
      isDeviceOnline: !isOffline,
      payloadSent: safePayload,
      errorDetail: errorDetail
    };

    const messageHtml = `
      <div style="font-size: 13px; text-align: left; line-height: 1.4;">
        <p><strong>🌐 IP Servidor:</strong> <code>${currentIp}</code></p>
        <p><strong>🔗 URL:</strong> <code style="word-break: break-all;">${req.method} ${req.url}</code></p>
        <p><strong>📡 Estado HTTP:</strong> <span style="color: #e53935; font-weight: bold;">${error.status} ${error.statusText || 'Error de Red'}</span></p>
        <p><strong>📶 Conexión:</strong> ${!isOffline ? '🟢 En Línea' : '🔴 Desconectado'}</p>
        <div style="margin-top: 8px;">
          <strong>🔍 Detalle:</strong>
          <pre style="background: #212121; color: #ffb74d; padding: 6px; border-radius: 4px; font-size: 11px; max-height: 100px; overflow-y: auto; white-space: pre-wrap;">${errorDetail}</pre>
        </div>
      </div>
    `;

    this.isAlertOpen = true;

    const alert = await this.alertController.create({
      header: '⚠️ Falla en Petición API',
      subHeader: `Error HTTP ${error.status || 0}`,
      message: messageHtml,
      backdropDismiss: false,
      buttons: [
        {
          text: 'Cerrar',
          role: 'cancel',
          handler: () => {
            this.isAlertOpen = false;
          }
        },
        {
          text: '📋 Copiar Datos',
          handler: () => {
            this.isAlertOpen = false;
            try {
              navigator.clipboard.writeText(JSON.stringify(diagnosticReport, null, 2));
            } catch (err) {
              console.warn('No se pudo copiar al portapapeles:', err);
            }
          }
        },
        {
          text: '⚙️ Configurar Red',
          handler: () => {
            this.isAlertOpen = false;
            this.router.navigate(['/data-sources']);
          }
        }
      ]
    });

    await alert.present();
  }

  private sanitizePayload(body: any): any {
    if (!body) return null;
    try {
      const copy = JSON.parse(JSON.stringify(body));
      if (typeof copy === 'object') {
        if ('password' in copy) copy.password = '********';
        if ('token' in copy) copy.token = '********';
      }
      return copy;
    } catch {
      return body;
    }
  }
}

/**
 * Función interceptora compatible con provideHttpClient(withInterceptors([errorInterceptorFn]))
 */
export const errorInterceptorFn: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const alertController = inject(AlertController);
  const configService = inject(ConfigService);
  const router = inject(Router);

  // Instanciar el manejador con las dependencias inyectadas
  const handler = new HttpErrorInterceptor(alertController, configService, router);
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      (handler as any).handleError(req, error);
      return throwError(() => error);
    })
  );
};
