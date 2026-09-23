import { Injectable } from '@angular/core';
import { Preferences } from '@capacitor/preferences';

@Injectable({
    providedIn: 'root'
})
export class StorageService {

    // Guardar cualquier dato por clave
    async set(key: string, value: any): Promise<void> {
        await Preferences.set({
            key: key,
            value: JSON.stringify(value)
        });
    }

    // Leer dato por clave
    async get(key: string): Promise<any> {
        const { value } = await Preferences.get({ key: key });
        return value ? JSON.parse(value) : null;
    }

    // Eliminar un registro específico
    async remove(key: string): Promise<void> {
        await Preferences.remove({ key: key });
    }

    // Limpiar todo el almacenamiento
    async clear(): Promise<void> {
        await Preferences.clear();
    }
}