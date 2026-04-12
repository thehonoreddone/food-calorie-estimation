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
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInUp,
  SlideInRight,
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
  getUserPosts,
  getUserPublicProfile,
  followUser,
  unfollowUser,
  isFollowingUser,
  getFollowCounts,
  CommunityPost,
  CommunityComment,
  PostType,
  UserPublicProfile,
} from '../services/firestoreService';
import { uploadCommunityImage } from '../services/storageService';
import { Colors, FontSize, Spacing, BorderRadius, Shadows } from '../constants/theme';

const { width: SW } = Dimensions.get('window');

// ─── Avatar Color Generator ─────────────────────────────────────────────────

const AVATAR_COLORS = [
  ['#6366f1', '#8b5cf6'],
  ['#ec4899', '#f43f5e'],
  ['#f97316', '#eab308'],
  ['#22c55e', '#14b8a6'],
  ['#3b82f6', '#06b6d4'],
  ['#ef4444', '#f97316'],
  ['#8b5cf6', '#ec4899'],
  ['#14b8a6', '#22c55e'],
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
        <View style={[styles.skeletonCircle, { width: 44, height: 44 }]} />
        <View style={{ flex: 1, gap: 6 }}>
          <View style={[styles.skeletonRect, { width: '40%', height: 12 }]} />
          <View style={[styles.skeletonRect, { width: '25%', height: 10 }]} />
        </View>
      </View>
      <View style={[styles.skeletonRect, { width: '100%', height: 14, marginHorizontal: 16, marginBottom: 8 }]} />
      <View style={[styles.skeletonRect, { width: '100%', height: SW * 0.55, borderRadius: 0 }]} />
      <View style={{ padding: Spacing.md, gap: 8 }}>
        <View style={[styles.skeletonRect, { width: '30%', height: 14 }]} />
        <View style={[styles.skeletonRect, { width: '60%', height: 12 }]} />
      </View>
    </View>
  );
}

// ─── User Profile Modal ─────────────────────────────────────────────────────

interface UserProfileModalProps {
  visible: boolean;
  onClose: () => void;
  targetUid: string;
  currentUid: string;
  currentUsername: string;
}

function UserProfileModal({ visible, onClose, targetUid, currentUid, currentUsername }: UserProfileModalProps) {
  const [profile, setProfile] = useState<UserPublicProfile | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [userPosts, setUserPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (visible && targetUid) {
      loadProfile();
    }
  }, [visible, targetUid]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const [prof, following, posts] = await Promise.all([
        getUserPublicProfile(targetUid),
        currentUid ? isFollowingUser(currentUid, targetUid) : Promise.resolve(false),
        getUserPosts(targetUid, 10, currentUid),
      ]);
      setProfile(prof);
      setIsFollowing(following);
      setUserPosts(posts);
    } catch (err) {
      console.warn('Profile load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async () => {
    if (!currentUid || !profile) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await unfollowUser(currentUid, targetUid);
        setIsFollowing(false);
        setProfile(p => p ? { ...p, followersCount: Math.max(0, (p.followersCount ?? 0) - 1) } : p);
      } else {
        await followUser(currentUid, currentUsername, targetUid, profile.name);
        setIsFollowing(true);
        setProfile(p => p ? { ...p, followersCount: (p.followersCount ?? 0) + 1 } : p);
      }
    } catch (err) {
      Alert.alert('Hata', 'İşlem başarısız oldu.');
    } finally {
      setFollowLoading(false);
    }
  };

  const avatarColors = getAvatarColors(profile?.name || 'A');
  const isSelf = currentUid === targetUid;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.profileModalOverlay}>
        <Animated.View entering={SlideInUp.springify()} style={styles.profileModalContent}>
          <View style={styles.modalHandle} />
          
          {loading ? (
            <View style={{ alignItems: 'center', padding: 40 }}>
              <ActivityIndicator size="large" color={Colors.primary[500]} />
            </View>
          ) : profile ? (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Profile header */}
              <View style={styles.profileHeader}>
                <LinearGradient
                  colors={avatarColors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.profileAvatar}
                >
                  <Text style={styles.profileAvatarText}>
                    {(profile.name || '?')[0].toUpperCase()}
                  </Text>
                </LinearGradient>
                <Text style={styles.profileName}>{profile.name}</Text>
              </View>

              {/* Stats */}
              <View style={styles.profileStatsRow}>
                <View style={styles.profileStatItem}>
                  <Text style={styles.profileStatNum}>{userPosts.length}</Text>
                  <Text style={styles.profileStatLabel}>Paylaşım</Text>
                </View>
                <View style={styles.profileStatDivider} />
                <View style={styles.profileStatItem}>
                  <Text style={styles.profileStatNum}>{profile.followersCount ?? 0}</Text>
                  <Text style={styles.profileStatLabel}>Takipçi</Text>
                </View>
                <View style={styles.profileStatDivider} />
                <View style={styles.profileStatItem}>
                  <Text style={styles.profileStatNum}>{profile.followingCount ?? 0}</Text>
                  <Text style={styles.profileStatLabel}>Takip</Text>
                </View>
              </View>

              {/* Follow button */}
              {!isSelf && (
                <TouchableOpacity
                  style={[styles.followBtn, isFollowing && styles.followBtnActive]}
                  onPress={handleToggleFollow}
                  disabled={followLoading}
                >
                  {followLoading ? (
                    <ActivityIndicator size="small" color={isFollowing ? Colors.primary[500] : '#fff'} />
                  ) : (
                    <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                      {isFollowing ? '✓ Takip Ediliyor' : '+ Takip Et'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              {/* User's posts */}
              {userPosts.length > 0 && (
                <View style={styles.profilePostsSection}>
                  <Text style={styles.profilePostsTitle}>Paylaşımlar</Text>
                  {userPosts.map(post => (
                    <View key={post.id} style={styles.profilePostCard}>
                      {post.imageUrl ? (
                        <Image source={{ uri: post.imageUrl }} style={styles.profilePostImage} resizeMode="cover" />
                      ) : null}
                      {post.description ? (
                        <Text style={styles.profilePostDesc} numberOfLines={3}>{post.description}</Text>
                      ) : null}
                      {post.mealName ? (
                        <Text style={styles.profilePostMeal}>🍽️ {post.mealName}</Text>
                      ) : null}
                      <Text style={styles.profilePostTime}>{timeAgo(post.createdAt || '')}</Text>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          ) : (
            <Text style={styles.profileNotFound}>Profil bulunamadı</Text>
          )}

          <TouchableOpacity style={styles.profileCloseBtn} onPress={onClose}>
            <Text style={styles.profileCloseBtnText}>Kapat</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ─── Post Card ──────────────────────────────────────────────────────────────

interface PostCardProps {
  post: CommunityPost;
  currentUserId: string;
  currentUsername: string;
  onLikeToggle: (postId: string, isLiked: boolean) => void;
  onDelete: (postId: string) => void;
  onUserPress: (uid: string) => void;
  index: number;
}

function PostCard({ post, currentUserId, currentUsername, onLikeToggle, onDelete, onUserPress, index }: PostCardProps) {
  const [liked, setLiked] = useState(post.likedByMe ?? false);
  const [likesCount, setLikesCount] = useState(post.likesCount ?? 0);
  const [likedByUsers, setLikedByUsers] = useState<string[]>(post.likedByUsers ?? []);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const likeScale = useSharedValue(1);
  const avatarColors = getAvatarColors(post.username || 'A');

  const handleLike = async () => {
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikesCount(prev => wasLiked ? prev - 1 : prev + 1);

    // Update likedByUsers
    if (!wasLiked) {
      setLikedByUsers(prev => {
        const newList = [currentUsername, ...prev.filter(u => u !== currentUsername)];
        return newList.slice(0, 5);
      });
    } else {
      setLikedByUsers(prev => prev.filter(u => u !== currentUsername));
    }

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
      const cmts = await getPostComments(post.id);
      setComments(cmts);
    } catch (err) {
      Alert.alert('Hata', 'Yorum gönderilemedi.');
    }
  };

  const handleDelete = () => {
    setShowMenu(false);
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
      entering={FadeInDown.delay(index * 60).duration(350).springify()}
      style={styles.card}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <TouchableOpacity onPress={() => onUserPress(post.uid)} activeOpacity={0.7}>
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
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => onUserPress(post.uid)} activeOpacity={0.7}>
          <Text style={styles.username}>{post.username || 'Anonim'}</Text>
          <Text style={styles.timeAgo}>{timeAgo(post.createdAt || '')}</Text>
        </TouchableOpacity>
        {isOwnPost && (
          <TouchableOpacity onPress={() => setShowMenu(!showMenu)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.moreIcon}>•••</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Menu dropdown */}
      {showMenu && isOwnPost && (
        <Animated.View entering={FadeIn.duration(150)} style={styles.menuDropdown}>
          <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
            <Text style={styles.menuItemTextDanger}>🗑️ Paylaşımı Sil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => setShowMenu(false)}>
            <Text style={styles.menuItemText}>✕ Kapat</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Description / Text content */}
      {post.description ? (
        <Text style={styles.postText}>{post.description}</Text>
      ) : null}

      {/* Image */}
      {post.imageUrl ? (
        <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />
      ) : null}

      {/* Meal info badge */}
      {post.mealName ? (
        <View style={styles.mealInfoRow}>
          <View style={styles.mealBadge}>
            <Text style={styles.mealBadgeText}>🍽️ {post.mealName}</Text>
          </View>
          {post.calories ? (
            <View style={styles.calorieBadge}>
              <Text style={styles.calorieText}>🔥 {post.calories} kcal</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Actions bar */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleLike} activeOpacity={0.7}>
          <Animated.Text style={[styles.actionIcon, likeAnimStyle]}>
            {liked ? '❤️' : '🤍'}
          </Animated.Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={handleToggleComments} activeOpacity={0.7}>
          <Text style={styles.actionIcon}>💬</Text>
        </TouchableOpacity>
      </View>

      {/* Liked by list */}
      {likesCount > 0 && (
        <View style={styles.likedByRow}>
          <Text style={styles.likedByIcon}>❤️</Text>
          <Text style={styles.likedByText} numberOfLines={1}>
            {likedByUsers.length > 0
              ? likedByUsers.join(', ')
              : `${likesCount} beğeni`
            }
            {likesCount > likedByUsers.length && likedByUsers.length > 0
              ? ` ve ${likesCount - likedByUsers.length} diğer kişi`
              : ''
            }
          </Text>
        </View>
      )}

      {/* Comments count */}
      {(post.commentsCount ?? 0) > 0 && !showComments && (
        <TouchableOpacity onPress={handleToggleComments} style={styles.commentsCountRow}>
          <Text style={styles.commentsCountText}>
            💬 {post.commentsCount} yorum  ▸
          </Text>
        </TouchableOpacity>
      )}

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
                  <Text style={styles.commentTime}>{timeAgo(c.createdAt || '')}</Text>
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
              placeholderTextColor="#666"
              maxLength={300}
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
  onSubmit: (data: { postType: PostType; mealName?: string; description: string; imageUri?: string; calories?: number }) => Promise<void>;
}

function CreatePostModal({ visible, onClose, onSubmit }: CreatePostModalProps) {
  const [postType, setPostType] = useState<PostType>('text');
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
        if (postType === 'text') setPostType('photo');
      }
    } catch (err) {
      console.warn('Image pick failed:', err);
    }
  };

  const handleSubmit = async () => {
    if (postType === 'text' && !description.trim()) {
      Alert.alert('Hata', 'Lütfen bir şeyler yazın.');
      return;
    }
    if (postType === 'meal' && !mealName.trim()) {
      Alert.alert('Hata', 'Yemek adı boş olamaz.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        postType,
        mealName: postType === 'meal' ? mealName.trim() : undefined,
        description: description.trim(),
        imageUri: imageUri || undefined,
        calories: postType === 'meal' && calories ? parseInt(calories, 10) : undefined,
      });
      // Reset
      setPostType('text');
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

  const POST_TYPE_OPTIONS: { key: PostType; icon: string; label: string }[] = [
    { key: 'text', icon: '✍️', label: 'Yazı' },
    { key: 'photo', icon: '📷', label: 'Fotoğraf' },
    { key: 'meal', icon: '🍽️', label: 'Yemek' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalOverlay}>
          <Animated.View entering={SlideInUp.springify()} style={styles.modalContent}>
            <View style={styles.modalHandle} />

            <Text style={styles.modalTitle}>✨ Yeni Paylaşım</Text>
            <Text style={styles.modalSubtitle}>Topluluğa bir şeyler paylaş!</Text>

            {/* Post type selector */}
            <View style={styles.postTypeRow}>
              {POST_TYPE_OPTIONS.map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.postTypeBtn, postType === opt.key && styles.postTypeBtnActive]}
                  onPress={() => setPostType(opt.key)}
                >
                  <Text style={styles.postTypeIcon}>{opt.icon}</Text>
                  <Text style={[styles.postTypeLabel, postType === opt.key && styles.postTypeLabelActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Description / text content */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {postType === 'text' ? 'Ne düşünüyorsun?' : 'Açıklama'}
                {postType === 'text' ? ' *' : ' (opsiyonel)'}
              </Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder={postType === 'meal'
                  ? "Bugün ne yaptın? Tarif, düşünceler..."
                  : postType === 'text'
                    ? "Ne düşünüyorsun? Neler oldu?"
                    : "Fotoğraf hakkında bir şeyler yaz..."}
                placeholderTextColor="#666"
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
            </View>

            {/* Image picker (for photo & meal) */}
            {(postType === 'photo' || postType === 'meal' || imageUri) && (
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
            )}

            {/* Meal-specific fields */}
            {postType === 'meal' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Yemek Adı *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={mealName}
                    onChangeText={setMealName}
                    placeholder="Örn: Tavuk & Pirinç"
                    placeholderTextColor="#666"
                    maxLength={60}
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Kalori (opsiyonel)</Text>
                  <TextInput
                    style={styles.textInput}
                    value={calories}
                    onChangeText={setCalories}
                    placeholder="Örn: 450"
                    placeholderTextColor="#666"
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
              </>
            )}

            {/* Text posts can also add photo */}
            {postType === 'text' && !imageUri && (
              <TouchableOpacity style={styles.addPhotoBtn} onPress={handlePickImage}>
                <Text style={styles.addPhotoBtnText}>📷 Fotoğraf da ekle</Text>
              </TouchableOpacity>
            )}

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
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [selectedProfileUid, setSelectedProfileUid] = useState<string | null>(null);

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
      await togglePostLike(postId, profile.uid, wasLiked, profile.name || 'Kullanıcı');
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

  const handleCreatePost = async (data: { postType: PostType; mealName?: string; description: string; imageUri?: string; calories?: number }) => {
    if (!profile.uid) return;

    let imageUrl: string | undefined;

    if (data.imageUri) {
      try {
        setUploadProgress('Fotoğraf yükleniyor...');
        imageUrl = await uploadCommunityImage(profile.uid, data.imageUri);
        setUploadProgress(null);
      } catch (uploadErr) {
        console.warn('Image upload failed, posting without image:', uploadErr);
        setUploadProgress(null);
      }
    }

    await createCommunityPost(
      profile.uid,
      profile.name || 'Kullanıcı',
      {
        postType: data.postType,
        mealName: data.mealName,
        calories: data.calories,
        description: data.description,
        imageUrl,
      }
    );
    fetchPosts();
  };

  const handleUserPress = (uid: string) => {
    setSelectedProfileUid(uid);
  };

  const renderPost = ({ item, index }: { item: CommunityPost; index: number }) => (
    <PostCard
      post={item}
      currentUserId={profile.uid || ''}
      currentUsername={profile.name || 'Kullanıcı'}
      onLikeToggle={handleLikeToggle}
      onDelete={handleDeletePost}
      onUserPress={handleUserPress}
      index={index}
    />
  );

  const avatarColors = getAvatarColors(profile.name || 'A');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header — dark, minimal like reference */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <LinearGradient
              colors={avatarColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.headerAvatar}
            >
              <Text style={styles.headerAvatarText}>
                {(profile.name || '?')[0].toUpperCase()}
              </Text>
            </LinearGradient>
            <View>
              <Text style={styles.headerTitle}>Topluluk</Text>
              <Text style={styles.headerSub}>Yemeklerini paylaş, ilham al!</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.headerNotifBtn}>
            <Text style={styles.headerNotifIcon}>🔔</Text>
          </TouchableOpacity>
        </View>
      </View>

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

      {/* Upload progress */}
      {uploadProgress && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.uploadBanner}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.uploadBannerText}>{uploadProgress}</Text>
        </Animated.View>
      )}

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
              colors={[Colors.primary[500]]}
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

      {/* User Profile Modal */}
      <UserProfileModal
        visible={!!selectedProfileUid}
        onClose={() => setSelectedProfileUid(null)}
        targetUid={selectedProfileUid || ''}
        currentUid={profile.uid || ''}
        currentUsername={profile.name || 'Kullanıcı'}
      />
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  // Header
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    backgroundColor: '#111',
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: '#fff',
  },
  headerSub: {
    fontSize: 11,
    color: '#888',
    marginTop: 1,
  },
  headerNotifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e1e1e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerNotifIcon: {
    fontSize: 18,
  },
  // Tabs
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: 8,
    backgroundColor: '#0a0a0a',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  activeTab: {
    backgroundColor: '#6366f1',
  },
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#888',
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
    borderRadius: 22,
    backgroundColor: '#1e1e1e',
  },
  skeletonRect: {
    borderRadius: 8,
    backgroundColor: '#1e1e1e',
  },
  // List
  listContent: {
    padding: Spacing.md,
    paddingBottom: 100,
  },
  // Card
  card: {
    backgroundColor: '#151515',
    borderRadius: 20,
    marginBottom: Spacing.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#1e1e1e',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: 12,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    color: '#e0e0e0',
  },
  timeAgo: {
    fontSize: 11,
    color: '#666',
    marginTop: 1,
  },
  moreIcon: {
    fontSize: FontSize.lg,
    color: '#666',
    fontWeight: '900',
    letterSpacing: 1,
  },
  // Menu dropdown
  menuDropdown: {
    backgroundColor: '#1e1e1e',
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
  },
  menuItemText: {
    color: '#ccc',
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  menuItemTextDanger: {
    color: '#ef4444',
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  // Post content
  postText: {
    fontSize: FontSize.base,
    color: '#e0e0e0',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    lineHeight: 22,
  },
  postImage: {
    width: '100%',
    height: SW * 0.6,
    backgroundColor: '#111',
  },
  // Meal info
  mealInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  mealBadge: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.3)',
  },
  mealBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: '#22c55e',
  },
  calorieBadge: {
    backgroundColor: 'rgba(249,115,22,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(249,115,22,0.3)',
  },
  calorieText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: '#f97316',
  },
  // Actions
  actions: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: 6,
    gap: 16,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionIcon: {
    fontSize: 22,
  },
  // Liked by
  likedByRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: 4,
    gap: 6,
  },
  likedByIcon: {
    fontSize: 12,
  },
  likedByText: {
    fontSize: 12,
    color: '#ccc',
    fontWeight: '600',
    flex: 1,
  },
  // Comments count
  commentsCountRow: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  commentsCountText: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
  },
  // Comments
  commentSection: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#1e1e1e',
    marginTop: 4,
  },
  commentItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  commentUser: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: '#e0e0e0',
    marginBottom: 2,
  },
  commentContent: {
    fontSize: FontSize.xs,
    color: '#bbb',
    lineHeight: 18,
  },
  commentTime: {
    fontSize: 10,
    color: '#555',
    marginTop: 2,
  },
  noComments: {
    fontSize: FontSize.xs,
    color: '#666',
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
    backgroundColor: '#1a1a1a',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: FontSize.sm,
    color: '#e0e0e0',
    borderWidth: 1,
    borderColor: '#2a2a2a',
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
    color: '#e0e0e0',
  },
  emptyDesc: {
    fontSize: FontSize.sm,
    color: '#888',
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
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#151515',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    maxHeight: '92%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333',
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: '#e0e0e0',
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: FontSize.sm,
    color: '#888',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: Spacing.lg,
  },
  // Post type
  postTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  postTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  postTypeBtnActive: {
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderColor: '#6366f1',
  },
  postTypeIcon: {
    fontSize: 16,
  },
  postTypeLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#888',
  },
  postTypeLabelActive: {
    color: '#6366f1',
  },
  // Image picker
  imagePickerBtn: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: '#2a2a2a',
    borderStyle: 'dashed',
  },
  imagePickerPlaceholder: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
  },
  imagePickerIcon: {
    fontSize: 36,
    marginBottom: 6,
  },
  imagePickerText: {
    fontSize: FontSize.sm,
    color: '#666',
    fontWeight: '600',
  },
  pickedImage: {
    width: '100%',
    height: 180,
  },
  addPhotoBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: '#1a1a1a',
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  addPhotoBtnText: {
    color: '#888',
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  // Input
  inputGroup: {
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#1a1a1a',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: FontSize.base,
    color: '#e0e0e0',
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    textAlignVertical: 'top',
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
    borderColor: '#2a2a2a',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#888',
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
  // Upload progress banner
  uploadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    gap: 8,
  },
  uploadBannerText: {
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  // Profile Modal
  profileModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  profileModalContent: {
    backgroundColor: '#151515',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: Spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 44 : 24,
    maxHeight: '85%',
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  profileAvatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
  },
  profileName: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: '#e0e0e0',
  },
  profileStatsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: Spacing.lg,
    gap: 0,
  },
  profileStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  profileStatNum: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: '#e0e0e0',
  },
  profileStatLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '600',
    marginTop: 2,
  },
  profileStatDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#2a2a2a',
  },
  followBtn: {
    paddingVertical: 12,
    borderRadius: BorderRadius.lg,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  followBtnActive: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  followBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FontSize.base,
  },
  followBtnTextActive: {
    color: '#6366f1',
  },
  profilePostsSection: {
    marginTop: Spacing.sm,
  },
  profilePostsTitle: {
    fontSize: FontSize.base,
    fontWeight: '700',
    color: '#e0e0e0',
    marginBottom: Spacing.md,
  },
  profilePostCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  profilePostImage: {
    width: '100%',
    height: 150,
  },
  profilePostDesc: {
    fontSize: FontSize.sm,
    color: '#ccc',
    padding: 12,
    lineHeight: 20,
  },
  profilePostMeal: {
    fontSize: FontSize.xs,
    color: '#22c55e',
    paddingHorizontal: 12,
    paddingBottom: 8,
    fontWeight: '600',
  },
  profilePostTime: {
    fontSize: 10,
    color: '#555',
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  profileNotFound: {
    color: '#888',
    textAlign: 'center',
    padding: 40,
    fontSize: FontSize.base,
  },
  profileCloseBtn: {
    paddingVertical: 14,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: '#2a2a2a',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  profileCloseBtnText: {
    color: '#888',
    fontWeight: '600',
    fontSize: FontSize.base,
  },
});
