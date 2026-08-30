import React, { useEffect, useState } from 'react';
import { View, Image, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { getAvatarSignedUrl } from '../features/settings/services/profile';

interface AvatarProps {
  path: string | null;
  size?: number;
  fallbackText?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ path, size = 100, fallbackText = '?' }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchUrl = async () => {
      if (!path) return;
      setLoading(true);
      const signedUrl = await getAvatarSignedUrl(path, 60 * 60); // 1 hour
      if (mounted) {
        setUrl(signedUrl);
        setLoading(false);
      }
    };

    fetchUrl();
    return () => { mounted = false; };
  }, [path]);

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (!path) {
    return (
      <View style={[styles.fallbackContainer, containerStyle]}>
        <Text style={[styles.fallbackText, { fontSize: size / 2.5 }]}>
          {fallbackText.charAt(0).toUpperCase()}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, containerStyle]}>
      {loading ? (
        <View style={[styles.loadingContainer, containerStyle]}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : url ? (
        <Image source={{ uri: url }} style={containerStyle} />
      ) : (
        <View style={[styles.fallbackContainer, containerStyle]}>
          <Text style={[styles.fallbackText, { fontSize: size / 2.5 }]}>!</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#333',
    overflow: 'hidden',
  },
  loadingContainer: {
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackContainer: {
    backgroundColor: '#555',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
