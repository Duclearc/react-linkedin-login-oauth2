import { useCallback, useEffect, useRef } from 'react';
import { LINKEDIN_OAUTH2_STATE } from './utils';

const getPopupPositionProperties = ({ width = 600, height = 600 }) => {
  const left = screen.width / 2 - width / 2;
  const top = screen.height / 2 - height / 2;
  return `left=${left},top=${top},width=${width},height=${height}`;
};

const generateRandomString = (length = 20) => {
  let result = '';
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

type LinkedInType = {
  redirectUri: string;
  clientId: string;
  onSuccess: (code: string) => void;
  onFailure?: ({
    error,
    errorMessage,
  }: {
    error: string;
    errorMessage: string;
  }) => void;
  scope?: string;
};

export function useLinkedIn({
  redirectUri,
  clientId,
  onSuccess,
  onFailure,
  scope = 'r_emailaddress',
}: LinkedInType) {
  const popupRef = useRef<Window>(null);

  useEffect(() => {
    return () => {
      window.removeEventListener('message', receiveMessage, false);

      if (popupRef.current) {
        popupRef.current.close();
        popupRef.current = null;
      }
    };
  }, []);

  const getUrl = () => {
    const scopeParam = `&scope=${encodeURI(scope)}`;
    const state = generateRandomString();
    localStorage.setItem(LINKEDIN_OAUTH2_STATE, state);
    const linkedInAuthLink = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirectUri}${scopeParam}&state=${state}`;
    return linkedInAuthLink;
  };

  const linkedInLogin = () => {
    window.removeEventListener('message', receiveMessage, false);
    popupRef.current = window.open(
      getUrl(),
      '_blank',
      getPopupPositionProperties({ width: 600, height: 600 }),
    );
    window.addEventListener('message', receiveMessage, false);
  };

  const receiveMessage = useCallback((event: MessageEvent) => {
    const state = localStorage.getItem(LINKEDIN_OAUTH2_STATE);
    if (event.origin === window.location.origin) {
      if (event.data.errorMessage && event.data.from === 'Linked In') {
        // Prevent CSRF attack by testing state
        if (event.data.state !== state) {
          popupRef.current && popupRef.current.close();
          return;
        }
        onFailure(event.data);
        popupRef.current && popupRef.current.close();
      } else if (event.data.code && event.data.from === 'Linked In') {
        // Prevent CSRF attack by testing state
        if (event.data.state !== state) {
          console.error('State does not match');
          popupRef.current && popupRef.current.close();
          return;
        }
        onSuccess(event.data.code);
        popupRef.current && popupRef.current.close();
      }
    }
  }, []);

  return {
    linkedInLogin,
  };
}
