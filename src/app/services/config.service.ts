import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ServerConfig {
  ip: string;
  apachePort: number;
  mysqlPort: number;
  protocol: 'http' | 'https';
  apiPath: string;
  updatedAt?: string;
}

export const DEFAULT_CONFIG: ServerConfig = {
  ip: '192.168.100.7',
  apachePort: 80,
  mysqlPort: 3304,
  protocol: 'http',
  apiPath: 'kanban-api',
  updatedAt: new Date().toISOString()
};

const STORAGE_KEY = 'taskstream_network_config';

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private configSubject: BehaviorSubject<ServerConfig>;
  public config$: Observable<ServerConfig>;

  constructor() {
    const initialConfig = this.loadConfig();
    this.configSubject = new BehaviorSubject<ServerConfig>(initialConfig);
    this.config$ = this.configSubject.asObservable();
  }

  /**
   * Carga la configuración guardada en localStorage o devuelve los valores por defecto
   */
  public loadConfig(): ServerConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
          apachePort: Number(parsed.apachePort) || DEFAULT_CONFIG.apachePort,
          mysqlPort: Number(parsed.mysqlPort) || DEFAULT_CONFIG.mysqlPort
        };
      }
    } catch (e) {
      console.warn('ConfigService: Error al leer localStorage, usando configuración por defecto.', e);
    }
    return { ...DEFAULT_CONFIG };
  }

  /**
   * Obtiene la configuración actual sincrónicamente
   */
  public getConfig(): ServerConfig {
    return this.configSubject.value;
  }

  /**
   * Guarda la configuración completa y notifica a los suscriptores
   */
  public saveConfig(config: Partial<ServerConfig>): ServerConfig {
    const updated: ServerConfig = {
      ...this.getConfig(),
      ...config,
      updatedAt: new Date().toISOString()
    };

    // Asegurar tipos numéricos para puertos
    updated.apachePort = Number(updated.apachePort) || 80;
    updated.mysqlPort = Number(updated.mysqlPort) || 3304;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('ConfigService: Error al guardar en localStorage', e);
    }

    this.configSubject.next(updated);
    return updated;
  }

  /**
   * Actualiza únicamente la IP del servidor
   */
  public updateIp(ip: string): void {
    const cleanIp = (ip || '').trim();
    if (cleanIp && cleanIp !== this.getConfig().ip) {
      this.saveConfig({ ip: cleanIp });
    }
  }

  /**
   * Genera dinámicamente la URL base para todas las peticiones API
   * Ejemplo: http://192.168.100.7/kanban-api o http://192.168.100.7:8080/kanban-api
   */
  public getBaseUrl(): string {
    const cfg = this.getConfig();
    const protocol = cfg.protocol || 'http';
    const ip = (cfg.ip || '192.168.100.7').trim();
    const port = Number(cfg.apachePort);
    const cleanPath = (cfg.apiPath || 'kanban-api').replace(/^\/+|\/+$/g, '');

    // Si el puerto es el estándar (80 en HTTP o 443 en HTTPS), se puede omitir o incluir
    const portString = (port && port !== 80 && port !== 443) ? `:${port}` : '';
    return `${protocol}://${ip}${portString}/${cleanPath}`;
  }

  /**
   * Obtiene la IP actual
   */
  public getCurrentIp(): string {
    return this.getConfig().ip;
  }

  /**
   * Restaura la configuración a los valores por defecto
   */
  public resetToDefaults(): ServerConfig {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Error al limpiar localStorage', e);
    }
    const defaults = { ...DEFAULT_CONFIG, updatedAt: new Date().toISOString() };
    this.configSubject.next(defaults);
    return defaults;
  }

  /**
   * Exporta la configuración actual como string JSON formateado
   */
  public exportAsJson(): string {
    return JSON.stringify(this.getConfig(), null, 2);
  }

  /**
   * Importa configuración desde un string JSON
   */
  public importFromJson(jsonString: string): boolean {
    try {
      const parsed = JSON.parse(jsonString);
      if (typeof parsed === 'object' && parsed !== null) {
        this.saveConfig(parsed);
        return true;
      }
    } catch (e) {
      console.error('JSON inválido para configuración', e);
    }
    return false;
  }
}
