import { useState, useEffect } from 'react';
import { getCurrentUser } from 'aws-amplify/auth';
import axios from 'axios';

// VAPID public key - necesitarás generar una
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa40HcCWLEw6_MzA3gqVD0vHLrjKSjaDkFxREhfTXfQjlD9RWuHqp1XWRytvQ8';

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      initializeServiceWorker();
    }
  }, []);

  const initializeServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registrado:', registration);
      
      // Verificar si ya hay suscripción
      const existingSubscription = await registration.pushManager.getSubscription();
      if (existingSubscription) {
        setSubscription(existingSubscription);
        setIsSubscribed(true);
      }
    } catch (error) {
      console.error('Error registrando Service Worker:', error);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async () => {
    if (!isSupported) return false;
    
    // Solicitar permisos de notificación
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.error('Permisos de notificación denegados');
      return false;
    }
    
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });

      // Guardar suscripción en el backend
      const user = await getCurrentUser();
      await axios.post('https://zwjh3jgrsi.execute-api.us-east-1.amazonaws.com/prod/push-subscription', {
        userId: user.username,
        subscription: subscription.toJSON()
      });

      setSubscription(subscription);
      setIsSubscribed(true);
      console.log('Suscrito a push notifications:', subscription);
      return true;
    } catch (error) {
      console.error('Error suscribiendo a push:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    if (!subscription) return false;
    
    setLoading(true);
    try {
      await subscription.unsubscribe();
      
      // Remover suscripción del backend
      const user = await getCurrentUser();
      await axios.delete('https://zwjh3jgrsi.execute-api.us-east-1.amazonaws.com/prod/push-subscription', {
        data: { userId: user.username }
      });

      setSubscription(null);
      setIsSubscribed(false);
      console.log('Desuscrito de push notifications');
      return true;
    } catch (error) {
      console.error('Error desuscribiendo de push:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    isSupported,
    isSubscribed,
    loading,
    subscribeToPush,
    unsubscribeFromPush
  };
};