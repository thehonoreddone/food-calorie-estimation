import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
} from 'react-native-reanimated';
import { useUser } from '../contexts/UserContext';
import {
  getCommunityPosts,
  togglePostLike,
  addPostComment,
  getPostComments,
  createCommunityPost,
  deleteCommunityPost,
  CommunityPost,
  CommunityComment,
} from '../services/firestoreService';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '../constants/theme';

const { width: SW } = Dimensions.get('window');

// ─── Avatar Color Generator ─────────────────────────────────────────────────

const AVATAR_COLORS = [
  ['#6366f1', '#8b5cf6'], // indigo-violet
  ['#ec4899', '#f43f5e'], // pink-rose
  ['#f97316', '#eab308'], // orange-yellow
  ['#22c55e', '#14b8a6'], // green-teal
  ['#3b82f6', '#06b6d4'], // blue-cyan
  ['#ef4444', '#f97316'], // red-orange
  ['#8b5cf6', '#ec4899'], // violet-pink
  ['#14b8a6', '#22c55e'], // teal-green
];

function getAvatarColors(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length] as [string, string];
}

// ─── Time ago helper ────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return 'Az önce';
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} gün önce`;
  return new Date(dateStr).toLocaleDateString('tr-TR');
}

// ─── Skeleton Loader ────────────────────────────────────────────────────────

function SkeletonPost() {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.skeletonCircle, { width: 40, height: 40 }]} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[styles.skeletonRect, { width: '40%', height: 12 }]} />
          <View style={[styles.skeletonRect, { width: '25%', height: 10 }]} />
        </View>
      </View>
      <View style={[styles.skeletonRect, { width: '100%', height: SW * 0.55, borderRadius: 0 }]} />
      <View style={{ padding: Spacing.md, gap: 8 }}>
        <View style={[styles.skeletonRect, { width: '50%', height: 14 }]} />
        <View style={[styles.skeletonRect, { width: '80%', height: 12 }]} />
      </View>
    </View>
  );
}

// ─── Post Card ──────────────────────────────────────────────────────────────

interface PostCardProps {
  post: CommunityPost;
  currentUserId: string;
  onLikeToggle: (postId: string, isLiked: boolean) => void;
  onDelete: (postId: string) => void;
  index: number;
}

function PostCard({ post, currentUserId, onLikeToggle, onDelete, index }: PostCardProps) {
  const [liked, setLiked] = useState(post.likedByMe ?? false);
  const [likesCount, setLikesCount] = useState(post.likesCount ?? 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const likeScale = useSharedValue(1);
  const avatarColors = getAvatarColors(post.username || 'A');

  const handleLike = async () => {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesCount(prev => wasLiked ? prev - 1 : prev + 1);

    // Heart pop animation
    likeScale.value = withSequence(
      withSpring(1.4, { damping: 4, stiffness: 400 }),
      withSpring(1, { damping: 6 }),
    );

    onLikeToggle(post.id!, wasLiked);
  };

  const likeAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const handleToggleComments = async () => {
    if (!showComments && post.id) {
      setLoadingComments(true);
      try {
        const cmts = await getPostComments(post.id);
        setComments(cmts);
      } catch (err) {
        console.warn('Failed to load comments:', err);
      }
      setLoadingComments(false);
    }
    setShowComments(!showComments);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !post.id) return;
    try {
      await addPostComment(post.id, currentUserId, newComment.trim());
      setNewComment('');
      Keyboard.dismiss();
      // Refresh comments
      const cmts = await getPostComments(post.id);
      setComments(cmts);
    } catch (err) {
      Alert.alert('Hata', 'Yorum gönderilemedi.');
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Paylaşımı Sil',
      'Bu paylaşımı silmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => onDelete(post.id!),
        },
      ]
    );
  };

  const isOwnPost = post.uid === currentUserId;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).duration(400).springify()}
      style={styles.card}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <LinearGradient
          colors={avatarColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatarContainer}
        >
          <Text style={styles.avatarText}>
            {(post.username || '?')[0].toUpperCase()}
          </Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.username}>{post.username || 'Anonim'}</Text>
          <Text style={styles.timeAgo}>{timeAgo(post.createdAt || '')}</Text>
        </View>
        {isOwnPost && (
          <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.moreIcon}>•••</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Image */}
      {post.imageUrl ? (
        <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
      ) : null}

      {/* Meal info */}
      <View style={styles.mealInfo}>
        <Text style={styles.mealName}>{post.mealName || 'Yemek'}</Text>
        {post.calories ? (
          <View style={styles.calorieBadge}>
            <Text style={styles.calorieText}>🔥 {post.calories} kcal</Text>
          </View>
        ) : null}
      </View>

      {/* Description */}
      {post.description ? (
        <Text style={styles.description}>{post.description}</Text>
      ) : null}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleLike} activeOpacity={0.7}>
          <Animated.Text style={[styles.actionIcon, likeAnimStyle]}>
            {liked ? '❤️' : '🤍'}
          </Animated.Text>
          <Text style={[styles.actionCount, liked && { color: '#ef4444' }]}>
            {likesCount}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={handleToggleComments} activeOpacity={0.7}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionCount}>{post.commentsCount ?? 0}</Text>
        </TouchableOpacity>
      </View>

      {/* Comments section */}
      {showComments && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.commentSection}>
          {loadingComments ? (
            <ActivityIndicator size="small" color={Colors.primary[500]} style={{ padding: 8 }} />
          ) : (
            <>
              {comments.map(c => (
                <View key={c.id} style={styles.commentItem}>
                  <Text style={styles.commentUser}>{c.username}</Text>
                  <Text style={styles.commentContent}>{c.content}</Text>
                </View>
              ))}
              {comments.length === 0 && (
                <Text style={styles.noComments}>Henüz yorum yok. İlk yorumu sen yap!</Text>
              )}
            </>
          )}

          {/* Comment input */}
          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Yorum yaz..."
              placeholderTextColor={Colors.text.light}
              maxLength={200}
            />
            <TouchableOpacity
              onPress={handleAddComment}
              style={[styles.sendBtn, !newComment.trim() && { opacity: 0.4 }]}
              disabled={!newComment.trim()}
            >
              <Text style={styles.sendBtnText}>Gönder</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ─── Create Post Modal ──────────────────────────────────────────────────────

interface CreatePostModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { mealName: string; description: string; imageUri?: string; calories?: number }) => Promise<void>;
}

function CreatePostModal({ visible, onClose, onSubmit }: CreatePostModalProps) {
  const [mealName, setMealName] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [calories, setCalories] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.7,
        aspect: [4, 3],
      });
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (err) {
      console.warn('Image pick failed:', err);
    }
  };

  const handleSubmit = async () => {
    if (!mealName.trim()) {
      Alert.alert('Hata', 'Yemek adı boş olamaz.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        mealName: mealName.trim(),
        description: description.trim(),
        imageUri: imageUri || undefined,
        calories: calories ? parseInt(calories, 10) : undefined,
      });
      // Reset
      setMealName('');
      setDescription('');
      setImageUri(null);
      setCalories('');
      onClose();
    } catch (err) {
      Alert.alert('Hata', 'Paylaşım oluşturulamadı.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={SlideInUp.springify()} style={styles.modalContent}>
            {/* Handle bar */}
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>📸 Yeni Paylaşım</Text>
            <Text style={styles.modalSubtitle}>Yemeğini toplulukla paylaş!</Text>

            {/* Image picker */}
            <TouchableOpacity style={styles.imagePickerBtn} onPress={handlePickImage} activeOpacity={0.7}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.pickedImage} resizeMode="cover" />
              ) : (
                <View style={styles.imagePickerPlaceholder}>
                  <Text style={styles.imagePickerIcon}>📷</Text>
                  <Text style={styles.imagePickerText}>Fotoğraf Ekle</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Meal name */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Yemek Adı *</Text>
              <TextInput
                style={styles.textInput}
                value={mealName}
                onChangeText={setMealName}
                placeholder="Örn: Tavuk & Pirinç"
                placeholderTextColor={Colors.text.light}
                maxLength={60}
              />
            </View>

            {/* Calories */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Kalori (opsiyonel)</Text>
              <TextInput
                style={styles.textInput}
                value={calories}
                onChangeText={setCalories}
                placeholder="Örn: 450"
                placeholderTextColor={Colors.text.light}
                keyboardType="numeric"
                maxLength={5}
              />
            </View>

            {/* Description */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Açıklama (opsiyonel)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Bugün ne yaptın?"
                placeholderTextColor={Colors.text.light}
                multiline
                maxLength={200}
                textAlignVertical="top"
              />
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={onClose}>
                <Text style={styles.modalCancelText}>İptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, isSubmitting && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Paylaş 🚀</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Community Screen ───────────────────────────────────────────────────────

export function CommunityScreen() {
  const { profile } = useUser();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'recent' | 'popular'>('recent');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, [activeTab]);

  const fetchPosts = async () => {
    try {
      const data = await getCommunityPosts(
        activeTab === 'popular' ? 'popular' : 'recent',
        20,
        profile.uid
      );
      setPosts(data);
    } catch (err) {
      console.warn('Failed to load posts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPosts();
  };

  const handleLikeToggle = async (postId: string, wasLiked: boolean) => {
    if (!profile.uid) return;
    try {
      await togglePostLike(postId, profile.uid, wasLiked);
    } catch (err) {
      console.warn('Like toggle failed:', err);
    }
  };

  const handleDeletePost = async (postId: string) => {
    try {
      await deleteCommunityPost(postId);
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      Alert.alert('Hata', 'Paylaşım silinemedi.');
    }
  };

  const handleCreatePost = async (data: { mealName: string; description: string; imageUri?: string; calories?: number }) => {
    if (!profile.uid) return;
    await createCommunityPost(
      profile.uid,
      profile.name || 'Kullanıcı',
      {
        mealName: data.mealName,
        calories: data.calories,
        description: data.description,
        imageUrl: data.imageUri,
      }
    );
    // Refresh feed
    fetchPosts();
  };

  const renderPost = ({ item, index }: { item: CommunityPost; index: number }) => (
    <PostCard
      post={item}
      currentUserId={profile.uid || ''}
      onLikeToggle={handleLikeToggle}
      onDelete={handleDeletePost}
      index={index}
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <LinearGradient
        colors={['#6366f1', '#8b5cf6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>👥 Topluluk</Text>
            <Text style={styles.headerSub}>Yemeklerini paylaş, ilham al!</Text>
          </View>
          <View style={styles.headerStats}>
            <View style={styles.statBubble}>
              <Text style={styles.statNum}>{posts.length}</Text>
              <Text style={styles.statLabel}>paylaşım</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {(['recent', 'popular'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => { setActiveTab(tab); setLoading(true); }}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab === 'recent' ? '🕒 Son' : '🔥 Popüler'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Post list */}
      {loading ? (
        <View style={styles.skeletonWrap}>
          <SkeletonPost />
          <SkeletonPost />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => item.id || Math.random().toString()}
          renderItem={renderPost}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.primary[500]}
            />
          }
          ListEmptyComponent={
            <Animated.View entering={FadeIn.delay(200)} style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyTitle}>Henüz paylaşım yok</Text>
              <Text style={styles.emptyDesc}>
                Bir yemek tarayarak veya aşağıdaki butona dokunarak{'\n'}ilk paylaşımı sen yap!
              </Text>
              <TouchableOpacity
                style={styles.emptyCreateBtn}
                onPress={() => setShowCreateModal(true)}
              >
                <Text style={styles.emptyCreateText}>✍️ İlk Paylaşımı Yap</Text>
              </TouchableOpacity>
            </Animated.View>
          }
        />
      )}

      {/* FAB - Create Post */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={['#6366f1', '#8b5cf6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.fabGradient}
        >
          <Text style={styles.fabIcon}>✏️</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Create Post Modal */}
      <CreatePostModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreatePost}
      />
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: '#fff',
  },
  headerSub: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  headerStats: {
    flexDirection: 'row',
    gap: 8,
  },
  statBubble: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  statNum: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
  },
  // Tabs
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    backgroundColor: Colors.neutral[100],
  },
  activeTab: {
    backgroundColor: '#6366f1',
  },
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  activeTabText: {
    color: '#fff',
  },
  // Skeleton
  skeletonWrap: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  skeletonCircle: {
    borderRadius: 20,
    backgroundColor: Colors.neutral[200],
  },
  skeletonRect: {
    borderRadius: 8,
    backgroundColor: Colors.neutral[200],
  },
  // List
  listContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius['2xl'],
    marginBottom: Spacing.md,
    overflow: 'hidden',
    ...Shadows.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: '#fff',
  },
  username: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  timeAgo: {
    fontSize: FontSize.xs,
    color: Colors.text.light,
    marginTop: 1,
  },
  moreIcon: {
    fontSize: FontSize.lg,
    color: Colors.text.light,
    fontWeight: '900',
    letterSpacing: 1,
  },
  // Post image
  postImage: {
    width: '100%',
    height: SW * 0.55,
    backgroundColor: Colors.neutral[100],
  },
  // Meal info
  mealInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  mealName: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: Colors.text.primary,
    flex: 1,
    textTransform: 'capitalize',
  },
  calorieBadge: {
    backgroundColor: Colors.accent.orange + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.accent.orange + '30',
  },
  calorieText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.accent.orange,
  },
  description: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    lineHeight: 20,
  },
  // Actions
  actions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    marginTop: Spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIcon: {
    fontSize: 20,
  },
  actionCount: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text.secondary,
  },
  // Comments
  commentSection: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  commentItem: {
    flexDirection: 'row',
    paddingVertical: 6,
    gap: 6,
  },
  commentUser: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.text.primary,
  },
  commentContent: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    flex: 1,
  },
  noComments: {
    fontSize: FontSize.xs,
    color: Colors.text.light,
    textAlign: 'center',
    paddingVertical: Spacing.md,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: Spacing.sm,
  },
  commentInput: {
    flex: 1,
    backgroundColor: Colors.neutral[100],
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: FontSize.sm,
    color: Colors.text.primary,
  },
  sendBtn: {
    backgroundColor: '#6366f1',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  sendBtnText: {
    color: '#fff',
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  // Loading
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
  },
  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text.primary,
  },
  emptyDesc: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyCreateBtn: {
    marginTop: Spacing.xl,
    backgroundColor: '#6366f1',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
  },
  emptyCreateText: {
    color: '#fff',
    fontSize: FontSize.base,
    fontWeight: '700',
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    ...Shadows.lg,
    zIndex: 50,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabIcon: {
    fontSize: 24,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.neutral[300],
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.text.primary,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: Spacing.lg,
  },
  // Image picker
  imagePickerBtn: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.neutral[200],
    borderStyle: 'dashed',
  },
  imagePickerPlaceholder: {
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.neutral[50],
  },
  imagePickerIcon: {
    fontSize: 40,
    marginBottom: 6,
  },
  imagePickerText: {
    fontSize: FontSize.sm,
    color: Colors.text.light,
    fontWeight: '600',
  },
  pickedImage: {
    width: '100%',
    height: 180,
  },
  // Input
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.text.secondary,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: Colors.neutral[50],
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: FontSize.base,
    color: Colors.text.primary,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  textArea: {
    height: 80,
    paddingTop: 12,
  },
  // Modal actions
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: Spacing.md,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  modalCancelText: {
    color: Colors.text.secondary,
    fontWeight: '600',
    fontSize: FontSize.base,
  },
  modalSubmitBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#6366f1',
    alignItems: 'center',
  },
  modalSubmitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FontSize.base,
  },
});
