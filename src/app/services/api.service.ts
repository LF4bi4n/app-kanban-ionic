import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { ConfigService } from './config.service';

@Injectable({
    providedIn: 'root'
})
export class ApiService {

    constructor(
        private http: HttpClient,
        private configService: ConfigService
    ) { }

    /**
     * URL base calculada dinámicamente según la configuración de red guardada
     */
    public get baseUrl(): string {
        return this.configService.getBaseUrl();
    }

    /**
     * Prueba de conectividad directa al servidor Apache / PHP
     */
    ping(): Observable<any> {
        return this.http.get(`${this.baseUrl}/login.php`, { observe: 'response' }).pipe(timeout(4000));
    }

    // 1. AUTENTICACIÓN / LOGIN
    login(credentials: { username: string; password: string }): Observable<any> {
        return this.http.post(`${this.baseUrl}/login.php`, credentials).pipe(timeout(5000));
    }

    // 2. TAREAS (CRUD)
    getTareas(): Observable<any> {
        return this.http.get(`${this.baseUrl}/tareas.php`).pipe(timeout(5000));
    }

    crearTarea(tarea: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/tareas.php`, tarea).pipe(timeout(5000));
    }

    actualizarTarea(tarea: any): Observable<any> {
        return this.http.put(`${this.baseUrl}/tareas.php`, tarea).pipe(timeout(5000));
    }

    eliminarTarea(id: number): Observable<any> {
        return this.http.delete(`${this.baseUrl}/tareas.php?id=${id}`).pipe(timeout(5000));
    }

    // 3. USUARIOS (CRUD)
    getUsuarios(): Observable<any> {
        return this.http.get(`${this.baseUrl}/usuarios.php`).pipe(timeout(5000));
    }

    crearUsuario(usuario: { username: string; password: string }): Observable<any> {
        return this.http.post(`${this.baseUrl}/usuarios.php`, usuario).pipe(timeout(5000));
    }

    actualizarUsuario(usuario: any): Observable<any> {
        return this.http.put(`${this.baseUrl}/usuarios.php`, usuario).pipe(timeout(5000));
    }

    eliminarUsuario(id: number): Observable<any> {
        return this.http.delete(`${this.baseUrl}/usuarios.php?id=${id}`).pipe(timeout(5000));
    }
}