import { useState } from 'react';
import { View, Text, Modal, Pressable, StyleSheet, Dimensions, FlatList, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ImageViewerProps {
  visible: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

export function ImageViewer({ visible, images, initialIndex = 0, onClose }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          initialScrollIndex={Math.min(initialIndex, Math.max(0, images.length - 1))}
          getItemLayout={(_, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
          keyExtractor={(item, i) => `${item}-${i}`}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setCurrentIndex(idx);
          }}
          renderItem={({ item }) => (
            <Pressable style={styles.page} onPress={onClose}>
              <Image
                source={{ uri: item }}
                style={styles.image}
                contentFit="contain"
                transition={150}
              />
            </Pressable>
          )}
        />
        <Pressable style={[styles.closeBtn, { top: Platform.OS === 'web' ? 20 : 54 }]} onPress={onClose} testID="image-viewer-close">
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </Pressable>
        {images.length > 1 && (
          <View style={styles.counter}>
            <Text style={styles.counterText}>{currentIndex + 1} / {images.length}</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.96)' },
  page: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  image: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.85 },
  closeBtn: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  counterText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Inter_500Medium' },
});
