'use client';
    
import {
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  CollectionReference,
  DocumentReference,
  SetOptions,
} from 'firebase/firestore';
import {
  ref,
  set,
  update,
  remove,
  DatabaseReference,
} from 'firebase/database';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Firestore Non-Blocking Updates (Retained for compatibility) */
export function setDocumentNonBlocking(docRef: DocumentReference, data: any, options: SetOptions) {
  setDoc(docRef, data, options).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: docRef.path,
      operation: 'write',
      requestResourceData: data,
    }));
  });
}

export function updateDocumentNonBlocking(docRef: DocumentReference, data: any) {
  updateDoc(docRef, data).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: docRef.path,
      operation: 'update',
      requestResourceData: data,
    }));
  });
}

export function deleteDocumentNonBlocking(docRef: DocumentReference) {
  deleteDoc(docRef).catch(error => {
    errorEmitter.emit('permission-error', new FirestorePermissionError({
      path: docRef.path,
      operation: 'delete',
    }));
  });
}

/** Realtime Database Non-Blocking Updates */
export function setRTDBNonBlocking(dbRef: DatabaseReference, data: any) {
  set(dbRef, data).catch(error => {
    console.error("RTDB Set Error:", error);
  });
}

export function updateRTDBNonBlocking(dbRef: DatabaseReference, data: any) {
  update(dbRef, data).catch(error => {
    console.error("RTDB Update Error:", error);
  });
}

export function removeRTDBNonBlocking(dbRef: DatabaseReference) {
  remove(dbRef).catch(error => {
    console.error("RTDB Remove Error:", error);
  });
}
