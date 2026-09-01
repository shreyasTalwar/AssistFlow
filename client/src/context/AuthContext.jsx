import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const { user: clerkUser, isLoaded: clerkIsLoaded } = useUser();
  const [currentUser, setCurrentUser] = useState(null);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [availableOrgs, setAvailableOrgs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (customEmail = null) => {
    try {
      if (customEmail) {
        localStorage.setItem('active_user_email', customEmail);
      }
      const res = await api.get('/users/me');
      if (res.data.success) {
        setCurrentUser(res.data.data.user);
        setCurrentOrg(res.data.data.organization);
        setAvailableUsers(res.data.data.availableUsers || []);
        setAvailableOrgs(res.data.data.availableOrganizations || []);
        if (res.data.data.user) {
          localStorage.setItem('active_user_id', res.data.data.user.id);
          localStorage.setItem('active_user_email', res.data.data.user.email);
        }
      }
    } catch (err) {
      console.error('Failed to load user info:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clerkIsLoaded) {
      if (clerkUser) {
        const clerkEmail = clerkUser.primaryEmailAddress?.emailAddress;
        if (clerkEmail) {
          localStorage.setItem('active_user_email', clerkEmail);
          fetchUserData(clerkEmail);
        } else {
          fetchUserData();
        }
      } else {
        // User is signed out, clear local cache
        localStorage.removeItem('active_user_email');
        localStorage.removeItem('active_user_id');
        setCurrentUser(null);
        setCurrentOrg(null);
        setLoading(false);
      }
    }
  }, [clerkIsLoaded, clerkUser]);

  const switchUser = (user) => {
    setCurrentUser(user);
    if (user.email) localStorage.setItem('active_user_email', user.email);
    if (user.id) localStorage.setItem('active_user_id', user.id);
    fetchUserData(user.email);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentOrg,
        availableUsers,
        availableOrgs,
        loading,
        switchUser,
        refreshUser: fetchUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
