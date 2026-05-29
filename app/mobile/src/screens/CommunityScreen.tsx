import React, { useState, useEffect } from 'react';
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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInUp,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
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
  getFollowing,
  CommunityPost,
  CommunityComment,
  PostType,
  UserPublicProfile,
} from '../services/firestoreService';
import { uploadCommunityImage } from '../services/storageService';
import { Spacing } from '../constants/theme';

const { width: SW } = Dimensions.get('window');

// ─── Brand Colors ────────────────────────────────────────────────────────────

const BRAND = {
  green: '#22C55E',
  greenDark: '#16A34A',
  greenLight: '#DCFCE7',
  orange: '#F97316',
  orangeLight: '#FFF7ED',
  blue: '#3B82F6',
  blueLight: '#EFF6FF',
  pink: '#EC4899',
  pinkLight: '#FDF2F8',
  bg: '#F0F0EA',
  card: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  textSub: '#6B7280',
  textMuted: '#9CA3AF',
};

// ─── Avatar Color Generator ──────────────────────────────────────────────────

const AVATAR_COLORS: [string, string][] = [
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
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Time ago helper ─────────────────────────────────────────────────────────

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

// ─── Macro Pill ──────────────────────────────────────────────────────────────

type MacroColor = 'green' | 'orange' | 'blue' | 'pink';

interface MacroPillProps {
  label: string;
  value: string;
  color: MacroColor;
}

const MACRO_COLORS = {
  green:  { bg: BRAND.green,  text: '#fff' },
  orange: { bg: BRAND.orange, text: '#fff' },
  blue:   { bg: BRAND.blue,   text: '#fff' },
  pink:   { bg: BRAND.pink,   text: '#fff' },
};

function MacroPill({ label, value, color }: MacroPillProps) {
  const c = MACRO_COLORS[color];
  return (
    <View style={[styles.macroPill, { backgroundColor: c.bg }]}>
      <Text style={[styles.macroPillText, { color: c.text }]}>
        {label ? `${value} ${label}` : value}
      </Text>
    </View>
  );
}

// ─── Stories Row (Daily Goals Hit) ──────────────────────────────────────────

interface StoryUser {
  id: string;
  name: string;
  uid: string;
  streak?: number;
  goalCompleted?: boolean;
  hasNewStory?: boolean;
}

interface StoriesRowProps {
  currentUserId: string;
  onUserPress: (uid: string) => void;
}

function StoriesRow({ currentUserId, onUserPress }: StoriesRowProps) {
  const [followingUsers, setFollowingUsers] = React.useState<StoryUser[]>([]);

  React.useEffect(() => {
    if (!currentUserId) return;
    getFollowing(currentUserId, 20)
      .then(relations => {
        const users: StoryUser[] = relations.map(r => ({
          id: r.id,
          name: r.followingName || 'Kullanıcı',
          uid: r.followingId,
          hasNewStory: true,
          goalCompleted: false,
        }));
        setFollowingUsers(users);
      })
      .catch(() => {});
  }, [currentUserId]);

  if (followingUsers.length === 0) return null;

  return (
    <View style={styles.storiesContainer}>
      <View style={styles.storiesHeader}>
        <Text style={styles.storiesHeaderIcon}>👥</Text>
        <Text style={styles.storiesHeaderText}>TAKİP ETTİKLERİN</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.storiesList}
      >
        {followingUsers.map(user => {
          const avatarColors = getAvatarColors(user.name);
          return (
            <TouchableOpacity
              key={user.id}
              style={styles.storyItem}
              onPress={() => onUserPress(user.uid)}
              activeOpacity={0.7}
            >
              <View style={styles.storyAvatarWrap}>
                <View style={[styles.storyRing, styles.storyRingActive]}>
                  <LinearGradient
                    colors={avatarColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.storyAvatar}
                  >
                    <Text style={styles.storyAvatarText}>
                      {user.name[0].toUpperCase()}
                    </Text>
                  </LinearGradient>
                </View>
              </View>
              <Text style={styles.storyName} numberOfLines={1}>{user.name.split(' ')[0]}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}


// ─── Skeleton Post ───────────────────────────────────────────────────────────

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
      <View style={[styles.skeletonRect, { width: '100%', height: SW * 0.6, borderRadius: 0 }]} />
      <View style={{ padding: Spacing.md, gap: 8 }}>
        <View style={[styles.skeletonRect, { width: '30%', height: 14 }]} />
        <View style={[styles.skeletonRect, { width: '75%', height: 12 }]} />
        <View style={[styles.skeletonRect, { width: '60%', height: 12 }]} />
      </View>
    </View>
  );
}

// ─── User Profile Modal ──────────────────────────────────────────────────────

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
              <ActivityIndicator size="large" color={BRAND.green} />
            </View>
          ) : profile ? (
            <ScrollView showsVerticalScrollIndicator={false}>
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

              {!isSelf && (
                <TouchableOpacity
                  style={[styles.followBtn, isFollowing && styles.followBtnActive]}
                  onPress={handleToggleFollow}
                  disabled={followLoading}
                >
                  {followLoading ? (
                    <ActivityIndicator size="small" color={isFollowing ? BRAND.green : '#fff'} />
                  ) : (
                    <Text style={[styles.followBtnText, isFollowing && styles.followBtnTextActive]}>
                      {isFollowing ? '✓ Takip Ediliyor' : '+ Takip Et'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}

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

// ─── Post Card ───────────────────────────────────────────────────────────────

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
  const [inspired, setInspired] = useState(false);
  const [inspireCount, setInspireCount] = useState(Math.floor(Math.random() * 80) + 10);
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
    likeScale.value = withSequence(
      withSpring(1.4, { damping: 4, stiffness: 400 }),
      withSpring(1, { damping: 6 }),
    );
    onLikeToggle(post.id!, wasLiked);
  };

  const handleInspire = () => {
    setInspired(prev => {
      setInspireCount(c => prev ? c - 1 : c + 1);
      return !prev;
    });
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
        { text: 'Sil', style: 'destructive', onPress: () => onDelete(post.id!) },
      ]
    );
  };

  const isOwnPost = post.uid === currentUserId;

  // Build macro pills from post data
  const macroPills: { label: string; value: string; color: MacroColor }[] = [];
  if (post.mealName) {
    // Show protein if available
    macroPills.push({ label: 'Protein', value: '—', color: 'green' });
  }
  if (post.calories) {
    macroPills.push({ label: '', value: `${post.calories} kcal`, color: 'orange' });
  }
  if (post.mealName && !post.calories) {
    // Meal without calories just show meal badge
  }

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
          <Text style={styles.usernameHandle}>@{(post.username || 'user').toLowerCase().replace(/\s+/g, '')}</Text>
        </TouchableOpacity>
        {isOwnPost && (
          <TouchableOpacity
            onPress={() => setShowMenu(!showMenu)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.moreBtn}
          >
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

      {/* Image with macro overlay */}
      {post.imageUrl ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: post.imageUrl }} style={styles.postImage} resizeMode="cover" />

          {/* Avatar overlay bottom-right */}
          <View style={styles.imageAvatarOverlay}>
            <LinearGradient
              colors={avatarColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.imageAvatarSmall}
            >
              <Text style={styles.imageAvatarSmallText}>
                {(post.username || '?')[0].toUpperCase()}
              </Text>
            </LinearGradient>
          </View>

          {/* Macro pills overlay */}
          {(post.mealName || post.calories) ? (
            <View style={styles.macroPillsOverlay}>
              {post.calories ? (
                <MacroPill label="Protein" value="—" color="green" />
              ) : null}
              {post.calories ? (
                <MacroPill label="" value={`${post.calories} kcal`} color="orange" />
              ) : null}
              {post.mealName ? (
                <MacroPill label="" value={`🍽️ ${post.mealName}`} color="blue" />
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Text content */}
      {post.description ? (
        <View style={styles.captionContainer}>
          <Text style={styles.captionText} numberOfLines={3}>
            <Text style={styles.captionUsername}>
              {(post.username || 'user').toLowerCase().replace(/\s+/g, '')}
            </Text>
            {' '}{post.description}
          </Text>
        </View>
      ) : null}

      {/* Actions bar */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleLike} activeOpacity={0.7}>
          <Animated.Text style={[styles.actionIcon, likeAnimStyle]}>
            {liked ? '❤️' : '🤍'}
          </Animated.Text>
          <Text style={[styles.actionCount, liked && { color: '#ef4444' }]}>{likesCount}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={handleToggleComments} activeOpacity={0.7}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionCount}>{post.commentsCount ?? 0}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={handleInspire} activeOpacity={0.7}>
          <Text style={styles.actionIcon}>{inspired ? '⭐' : '✨'}</Text>
          <Text style={[styles.actionCount, inspired && { color: '#f59e0b' }]}>{inspireCount}</Text>
        </TouchableOpacity>
      </View>

      {/* Time ago */}
      <Text style={styles.timeAgoText}>{timeAgo(post.createdAt || '')}</Text>

      {/* Comments section */}
      {showComments && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.commentSection}>
          {loadingComments ? (
            <ActivityIndicator size="small" color={BRAND.green} style={{ padding: 8 }} />
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

          <View style={styles.commentInputRow}>
            <TextInput
              style={styles.commentInput}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Yorum yaz..."
              placeholderTextColor={BRAND.textMuted}
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

// ─── Create Post Modal ───────────────────────────────────────────────────────

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
      // Check & request media library permission explicitly
      const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        if (!canAskAgain) {
          Alert.alert(
            'Galeri İzni Gerekli',
            'Fotoğraf seçebilmek için galeri erişim izni gerekli. Lütfen uygulama ayarlarından izni açın.',
            [
              { text: 'İptal', style: 'cancel' },
              { text: 'Ayarları Aç', onPress: () => Linking.openSettings() },
            ]
          );
        } else {
          Alert.alert('İzin Gerekli', 'Galeriden fotoğraf seçebilmek için erişim izni vermeniz gerekiyor.');
        }
        return;
      }
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
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.modalOverlay}>
          <Animated.View entering={SlideInUp.springify()} style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>✨ Yeni Paylaşım</Text>
            <Text style={styles.modalSubtitle}>Topluluğa bir şeyler paylaş!</Text>

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

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {postType === 'text' ? 'Ne düşünüyorsun?' : 'Açıklama'}
                {postType === 'text' ? ' *' : ' (opsiyonel)'}
              </Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder={
                  postType === 'meal'
                    ? 'Bugün ne yaptın? Tarif, düşünceler...'
                    : postType === 'text'
                    ? 'Ne düşünüyorsun? Neler oldu?'
                    : 'Fotoğraf hakkında bir şeyler yaz...'
                }
                placeholderTextColor={BRAND.textMuted}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
            </View>

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

            {postType === 'meal' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Yemek Adı *</Text>
                  <TextInput
                    style={styles.textInput}
                    value={mealName}
                    onChangeText={setMealName}
                    placeholder="Örn: Tavuk & Pirinç"
                    placeholderTextColor={BRAND.textMuted}
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
                    placeholderTextColor={BRAND.textMuted}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
              </>
            )}

            {postType === 'text' && !imageUri && (
              <TouchableOpacity style={styles.addPhotoBtn} onPress={handlePickImage}>
                <Text style={styles.addPhotoBtnText}>📷 Fotoğraf da ekle</Text>
              </TouchableOpacity>
            )}

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

// ─── Community Screen ─────────────────────────────────────────────────────────

type FeedTab = 'forYou' | 'following' | 'trending';

export function CommunityScreen() {
  const { profile } = useUser();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingUids, setFollowingUids] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<FeedTab>('forYou');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [selectedProfileUid, setSelectedProfileUid] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // Load following UIDs once
  useEffect(() => {
    if (!profile.uid) return;
    getFollowing(profile.uid, 50)
      .then(relations => setFollowingUids(relations.map(r => r.followingId)))
      .catch(() => {});
  }, [profile.uid]);

  useEffect(() => {
    fetchPosts();
  }, [activeTab, followingUids]);

  const fetchPosts = async () => {
    try {
      const sortBy = activeTab === 'trending' ? 'popular' : 'recent';
      let data = await getCommunityPosts(sortBy, 30, profile.uid);

      // 'Following' tab: show only posts from followed users
      if (activeTab === 'following') {
        if (followingUids.length === 0) {
          data = [];
        } else {
          data = data.filter(p => followingUids.includes(p.uid));
        }
      }

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

  const handleCreatePost = async (data: {
    postType: PostType;
    mealName?: string;
    description: string;
    imageUri?: string;
    calories?: number;
  }) => {
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
    await createCommunityPost(profile.uid, profile.name || 'Kullanıcı', {
      postType: data.postType,
      mealName: data.mealName,
      calories: data.calories,
      description: data.description,
      imageUrl,
    });
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

  const TABS: { key: FeedTab; label: string; icon: string }[] = [
    { key: 'forYou', label: 'Keşfet', icon: '✨' },
    { key: 'following', label: 'Takip', icon: '👥' },
    { key: 'trending', label: 'Popüler', icon: '🔥' },
  ];

  // Filter posts by search query
  const filteredPosts = searchQuery.trim()
    ? posts.filter(p =>
        (p.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.mealName || '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : posts;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerLogoCircle}>
            <Text style={styles.headerLogoText}>N</Text>
          </View>
          <Text style={styles.headerTitle}>Topluluk</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => { setShowSearch(!showSearch); if (showSearch) setSearchQuery(''); }}>
            <Text style={styles.headerIconText}>{showSearch ? '✕' : '🔍'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowNotifPanel(!showNotifPanel)}>
            <View style={styles.notifBadge} />
            <Text style={styles.headerIconText}>🔔</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerAddBtn}
            onPress={() => setShowCreateModal(true)}
          >
            <Text style={styles.headerAddIcon}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Search Bar ── */}
      {showSearch && (
        <Animated.View entering={FadeInDown.duration(200)} style={styles.searchBarContainer}>
          <View style={styles.searchBar}>
            <Text style={styles.searchBarIcon}>🔍</Text>
            <TextInput
              style={styles.searchBarInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Kullanıcı, yemek veya paylaşım ara..."
              placeholderTextColor={BRAND.textMuted}
              autoFocus
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.searchBarClear}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      )}

      {/* ── Notification Panel ── */}
      {showNotifPanel && (
        <Animated.View entering={FadeInDown.duration(200)} style={styles.notifPanel}>
          <View style={styles.notifPanelHeader}>
            <Text style={styles.notifPanelTitle}>🔔 Bildirimler</Text>
            <TouchableOpacity onPress={() => setShowNotifPanel(false)}>
              <Text style={styles.notifPanelClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.notifPanelEmpty}>
            <Text style={styles.notifPanelEmptyIcon}>🔕</Text>
            <Text style={styles.notifPanelEmptyText}>Henüz bildirim yok</Text>
            <Text style={styles.notifPanelEmptyDesc}>Birisi seni takip ettiğinde veya paylaşımına{"\n"}yorum yaptığında burada göreceksin.</Text>
          </View>
        </Animated.View>
      )}

      {/* Upload progress */}
      {uploadProgress && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.uploadBanner}>
          <ActivityIndicator size="small" color="#fff" />
          <Text style={styles.uploadBannerText}>{uploadProgress}</Text>
        </Animated.View>
      )}

      <FlatList
        data={loading ? [] : filteredPosts}
        keyExtractor={item => item.id || Math.random().toString()}
        renderItem={renderPost}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={BRAND.green}
            colors={[BRAND.green]}
          />
        }
        ListHeaderComponent={
          <>
            {/* Stories / Daily Goals Row */}
            <StoriesRow
              currentUserId={profile.uid || ''}
              onUserPress={handleUserPress}
            />

            {/* Tab bar */}
            <View style={styles.tabBar}>
              {TABS.map(tab => (
                <TouchableOpacity
                  key={tab.key}
                  style={styles.tab}
                  onPress={() => { setActiveTab(tab.key); setLoading(true); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                    {tab.icon} {tab.label}
                  </Text>
                  {activeTab === tab.key && <View style={styles.tabIndicator} />}
                </TouchableOpacity>
              ))}
            </View>

            {/* Loading skeletons */}
            {loading && (
              <View style={{ gap: 0 }}>
                <SkeletonPost />
                <SkeletonPost />
              </View>
            )}
          </>
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading ? (
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
          ) : null
        }
      />

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

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.bg,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: BRAND.card,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLogoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BRAND.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: BRAND.text,
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconText: {
    fontSize: 20,
  },
  notifBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BRAND.orange,
    zIndex: 1,
  },
  headerAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BRAND.green,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAddIcon: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '300',
    lineHeight: 28,
    marginTop: -2,
  },

  // ── Stories ─────────────────────────────────────────────────────────────
  storiesContainer: {
    backgroundColor: BRAND.card,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  storiesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 6,
  },
  storiesHeaderIcon: {
    fontSize: 14,
  },
  storiesHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: BRAND.textMuted,
    letterSpacing: 1,
  },
  storiesList: {
    paddingHorizontal: 12,
    gap: 8,
  },
  storyItem: {
    alignItems: 'center',
    gap: 4,
    marginHorizontal: 4,
  },
  storyAvatarWrap: {
    position: 'relative',
  },
  storyRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyRingActive: {
    borderWidth: 2.5,
    borderColor: BRAND.green,
  },
  storyRingInactive: {
    borderWidth: 2,
    borderColor: BRAND.border,
  },
  storyAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: BRAND.card,
  },
  storyAvatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  storyTick: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: BRAND.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: BRAND.card,
  },
  storyTickIcon: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '900',
  },
  storyStreak: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: BRAND.orange,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  storyStreakText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },
  storyName: {
    fontSize: 11,
    fontWeight: '600',
    color: BRAND.text,
    maxWidth: 68,
    textAlign: 'center',
  },

  // ── Tab Bar ──────────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    backgroundColor: BRAND.card,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    position: 'relative',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.textSub,
  },
  activeTabText: {
    color: BRAND.green,
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '15%',
    right: '15%',
    height: 2.5,
    backgroundColor: BRAND.green,
    borderRadius: 2,
  },

  // ── Upload banner ────────────────────────────────────────────────────────
  uploadBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: BRAND.green,
  },
  uploadBannerText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },

  // ── Skeleton ─────────────────────────────────────────────────────────────
  skeletonCircle: {
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
  },
  skeletonRect: {
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },

  // ── List ─────────────────────────────────────────────────────────────────
  listContent: {
    paddingBottom: 100,
  },

  // ── Card ─────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: BRAND.card,
    marginHorizontal: 0,
    marginBottom: 8,
    borderRadius: 0,
    overflow: 'hidden',
    borderTopWidth: 0.5,
    borderTopColor: BRAND.border,
    borderBottomWidth: 0.5,
    borderBottomColor: BRAND.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  avatarContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  username: {
    fontSize: 14,
    fontWeight: '700',
    color: BRAND.text,
  },
  usernameHandle: {
    fontSize: 12,
    color: BRAND.textSub,
    marginTop: 1,
  },
  moreBtn: {
    padding: 4,
  },
  moreIcon: {
    fontSize: 16,
    color: BRAND.textMuted,
    fontWeight: '900',
    letterSpacing: 1,
  },

  // ── Menu dropdown ─────────────────────────────────────────────────────────
  menuDropdown: {
    backgroundColor: '#F9FAFB',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: BRAND.border,
  },
  menuItemText: {
    color: BRAND.textSub,
    fontSize: 14,
    fontWeight: '600',
  },
  menuItemTextDanger: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
  },

  // ── Image & Macro Pills ───────────────────────────────────────────────────
  imageContainer: {
    position: 'relative',
    width: '100%',
    height: SW * 0.72,
  },
  postImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
  },
  imageAvatarOverlay: {
    position: 'absolute',
    bottom: 12,
    right: 12,
  },
  imageAvatarSmall: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  imageAvatarSmallText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
  macroPillsOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    flexDirection: 'row',
    gap: 6,
  },
  macroPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  macroPillText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // ── Caption ───────────────────────────────────────────────────────────────
  captionContainer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
  },
  captionText: {
    fontSize: 14,
    color: BRAND.text,
    lineHeight: 20,
  },
  captionUsername: {
    fontWeight: '700',
    color: BRAND.text,
  },

  // ── Actions ───────────────────────────────────────────────────────────────
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionIcon: {
    fontSize: 22,
  },
  actionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: BRAND.textSub,
  },
  timeAgoText: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    fontSize: 12,
    color: BRAND.textMuted,
  },

  // ── Comment Section ───────────────────────────────────────────────────────
  commentSection: {
    borderTopWidth: 0.5,
    borderTopColor: BRAND.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  commentItem: {
    marginBottom: 8,
  },
  commentUser: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND.text,
  },
  commentContent: {
    fontSize: 13,
    color: BRAND.textSub,
    marginTop: 2,
  },
  commentTime: {
    fontSize: 11,
    color: BRAND.textMuted,
    marginTop: 2,
  },
  noComments: {
    fontSize: 13,
    color: BRAND.textMuted,
    textAlign: 'center',
    paddingVertical: 8,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  commentInput: {
    flex: 1,
    height: 38,
    paddingHorizontal: 14,
    borderRadius: 19,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: BRAND.border,
    fontSize: 13,
    color: BRAND.text,
  },
  sendBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 19,
    backgroundColor: BRAND.green,
  },
  sendBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },

  // ── Empty State ───────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: BRAND.text,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: BRAND.textSub,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  emptyCreateBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: BRAND.green,
  },
  emptyCreateText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  // ── Create Post Modal ─────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContent: {
    backgroundColor: BRAND.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '90%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: BRAND.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: BRAND.text,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: BRAND.textSub,
    marginBottom: 20,
  },
  postTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  postTypeBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: BRAND.border,
    gap: 4,
  },
  postTypeBtnActive: {
    backgroundColor: BRAND.greenLight,
    borderColor: BRAND.green,
  },
  postTypeIcon: {
    fontSize: 20,
  },
  postTypeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: BRAND.textSub,
  },
  postTypeLabelActive: {
    color: BRAND.greenDark,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: BRAND.textSub,
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1.5,
    borderColor: BRAND.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: BRAND.text,
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  imagePickerBtn: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: BRAND.border,
    borderStyle: 'dashed',
  },
  imagePickerPlaceholder: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    gap: 8,
  },
  imagePickerIcon: {
    fontSize: 32,
  },
  imagePickerText: {
    fontSize: 14,
    color: BRAND.textSub,
    fontWeight: '600',
  },
  pickedImage: {
    width: '100%',
    height: 200,
  },
  addPhotoBtn: {
    paddingVertical: 10,
    marginBottom: 14,
    alignItems: 'center',
  },
  addPhotoBtnText: {
    fontSize: 14,
    color: BRAND.green,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1.5,
    borderColor: BRAND.border,
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: BRAND.textSub,
  },
  modalSubmitBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: BRAND.green,
  },
  modalSubmitText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
  },

  // ── User Profile Modal ────────────────────────────────────────────────────
  profileModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  profileModalContent: {
    backgroundColor: BRAND.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
  },
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: BRAND.text,
  },
  profileStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  profileStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  profileStatNum: {
    fontSize: 22,
    fontWeight: '800',
    color: BRAND.text,
  },
  profileStatLabel: {
    fontSize: 12,
    color: BRAND.textSub,
    fontWeight: '500',
  },
  profileStatDivider: {
    width: 1,
    backgroundColor: BRAND.border,
    marginVertical: 4,
  },
  followBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: BRAND.green,
    marginBottom: 16,
  },
  followBtnActive: {
    backgroundColor: BRAND.greenLight,
    borderWidth: 1.5,
    borderColor: BRAND.green,
  },
  followBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  followBtnTextActive: {
    color: BRAND.greenDark,
  },
  profilePostsSection: {
    gap: 12,
  },
  profilePostsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: BRAND.text,
  },
  profilePostCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: BRAND.border,
  },
  profilePostImage: {
    width: '100%',
    height: 180,
  },
  profilePostDesc: {
    fontSize: 13,
    color: BRAND.textSub,
    padding: 12,
    lineHeight: 20,
  },
  profilePostMeal: {
    fontSize: 13,
    fontWeight: '700',
    color: BRAND.green,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  profilePostTime: {
    fontSize: 11,
    color: BRAND.textMuted,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  profileNotFound: {
    fontSize: 16,
    color: BRAND.textSub,
    textAlign: 'center',
    paddingVertical: 40,
  },
  profileCloseBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    marginTop: 12,
  },
  profileCloseBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: BRAND.textSub,
  },

  // ── Search Bar ──────────────────────────────────────────────────────────
  searchBarContainer: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: BRAND.bg,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BRAND.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: BRAND.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  searchBarIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 15,
    color: BRAND.text,
    padding: 0,
  },
  searchBarClear: {
    fontSize: 16,
    color: BRAND.textMuted,
    paddingLeft: 8,
  },

  // ── Notification Panel ──────────────────────────────────────────────────
  notifPanel: {
    marginHorizontal: Spacing.md,
    marginVertical: 8,
    backgroundColor: BRAND.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BRAND.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  notifPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: BRAND.border,
  },
  notifPanelTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: BRAND.text,
  },
  notifPanelClose: {
    fontSize: 18,
    color: BRAND.textMuted,
    padding: 4,
  },
  notifPanelEmpty: {
    alignItems: 'center',
    paddingVertical: 28,
    paddingHorizontal: 20,
  },
  notifPanelEmptyIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  notifPanelEmptyText: {
    fontSize: 15,
    fontWeight: '600',
    color: BRAND.text,
    marginBottom: 4,
  },
  notifPanelEmptyDesc: {
    fontSize: 13,
    color: BRAND.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
