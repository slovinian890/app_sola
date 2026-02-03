import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  id: string;
  username: string;
  profilePicture?: string;
  createdAt: number;
}

export interface Friend {
  id: string;
  username: string;
  profilePicture?: string;
  addedAt: number;
}

export interface Run {
  id: string;
  userId: string;
  distance: number; // in km
  duration: number; // in seconds
  pace: number; // in seconds per km
  date: number;
  sharedWith: string[]; // friend IDs
  route?: Array<{ latitude: number; longitude: number }>;
  posted?: boolean; // Whether run is posted to feed
}

export interface Post {
  id: string;
  userId: string;
  username: string;
  profilePicture?: string;
  runId: string;
  description: string;
  distance: number;
  duration: number;
  pace: number;
  date: number;
  likes: string[]; // User IDs who liked
  likedByCurrentUser?: boolean;
}

const STORAGE_KEYS = {
  PROFILE: '@runner:profile',
  FRIENDS: '@runner:friends',
  RUNS: '@runner:runs',
  POSTS: '@runner:posts',
  DEMO_INITIALIZED: '@runner:demo_initialized',
};

// Profile Management
export const getProfile = async (): Promise<UserProfile | null> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PROFILE);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting profile:', error);
    return null;
  }
};

export const saveProfile = async (profile: UserProfile): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    return true;
  } catch (error) {
    console.error('Error saving profile:', error);
    return false;
  }
};

export const updateProfile = async (updates: Partial<UserProfile>): Promise<boolean> => {
  try {
    const current = await getProfile();
    if (!current) return false;
    const updated = { ...current, ...updates };
    return await saveProfile(updated);
  } catch (error) {
    console.error('Error updating profile:', error);
    return false;
  }
};

// Friends Management
export const getFriends = async (): Promise<Friend[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.FRIENDS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting friends:', error);
    return [];
  }
};

export const addFriend = async (friend: Friend): Promise<boolean> => {
  try {
    const friends = await getFriends();
    // Check if friend already exists
    if (friends.some(f => f.id === friend.id)) {
      return false;
    }
    friends.push(friend);
    await AsyncStorage.setItem(STORAGE_KEYS.FRIENDS, JSON.stringify(friends));
    return true;
  } catch (error) {
    console.error('Error adding friend:', error);
    return false;
  }
};

export const removeFriend = async (friendId: string): Promise<boolean> => {
  try {
    const friends = await getFriends();
    const filtered = friends.filter(f => f.id !== friendId);
    await AsyncStorage.setItem(STORAGE_KEYS.FRIENDS, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error removing friend:', error);
    return false;
  }
};

// Runs Management
export const getRuns = async (userId?: string): Promise<Run[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.RUNS);
    const allRuns: Run[] = data ? JSON.parse(data) : [];
    if (userId) {
      return allRuns.filter(run => run.userId === userId);
    }
    return allRuns;
  } catch (error) {
    console.error('Error getting runs:', error);
    return [];
  }
};

export const saveRun = async (run: Run): Promise<boolean> => {
  try {
    const runs = await getRuns();
    runs.push(run);
    await AsyncStorage.setItem(STORAGE_KEYS.RUNS, JSON.stringify(runs));
    return true;
  } catch (error) {
    console.error('Error saving run:', error);
    return false;
  }
};

export const shareRunWithFriends = async (runId: string, friendIds: string[]): Promise<boolean> => {
  try {
    const runs = await getRuns();
    const runIndex = runs.findIndex(r => r.id === runId);
    if (runIndex === -1) return false;
    
    runs[runIndex].sharedWith = [...new Set([...runs[runIndex].sharedWith, ...friendIds])];
    await AsyncStorage.setItem(STORAGE_KEYS.RUNS, JSON.stringify(runs));
    return true;
  } catch (error) {
    console.error('Error sharing run:', error);
    return false;
  }
};

export const getSharedRuns = async (userId: string): Promise<Run[]> => {
  try {
    const allRuns = await getRuns();
    return allRuns.filter(run => 
      run.sharedWith.includes(userId) && run.userId !== userId
    );
  } catch (error) {
    console.error('Error getting shared runs:', error);
    return [];
  }
};

// Posts Management
export const getPosts = async (): Promise<Post[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.POSTS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting posts:', error);
    return [];
  }
};

export const createPost = async (post: Post): Promise<boolean> => {
  try {
    const posts = await getPosts();
    posts.unshift(post); // Add to beginning
    await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
    return true;
  } catch (error) {
    console.error('Error creating post:', error);
    return false;
  }
};

export const toggleLikePost = async (postId: string, userId: string): Promise<boolean> => {
  try {
    const posts = await getPosts();
    const postIndex = posts.findIndex(p => p.id === postId);
    if (postIndex === -1) return false;
    
    const post = posts[postIndex];
    const likeIndex = post.likes.indexOf(userId);
    if (likeIndex > -1) {
      post.likes.splice(likeIndex, 1);
    } else {
      post.likes.push(userId);
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts));
    return true;
  } catch (error) {
    console.error('Error toggling like:', error);
    return false;
  }
};

export const markRunAsPosted = async (runId: string): Promise<boolean> => {
  try {
    const runs = await getRuns();
    const runIndex = runs.findIndex(r => r.id === runId);
    if (runIndex === -1) return false;
    
    runs[runIndex].posted = true;
    await AsyncStorage.setItem(STORAGE_KEYS.RUNS, JSON.stringify(runs));
    return true;
  } catch (error) {
    console.error('Error marking run as posted:', error);
    return false;
  }
};

// Demo Data Initialization
export const initializeDemoData = async (): Promise<void> => {
  try {
    const initialized = await AsyncStorage.getItem(STORAGE_KEYS.DEMO_INITIALIZED);
    if (initialized === 'true') return;

    // Create demo users
    const demoUsers: Friend[] = [
      {
        id: 'demo_user_1',
        username: 'MarathonMike',
        addedAt: Date.now() - 86400000 * 5,
      },
      {
        id: 'demo_user_2',
        username: 'SpeedRunner',
        addedAt: Date.now() - 86400000 * 3,
      },
      {
        id: 'demo_user_3',
        username: 'TrailBlazer',
        addedAt: Date.now() - 86400000 * 2,
      },
      {
        id: 'demo_user_4',
        username: 'UrbanRunner',
        addedAt: Date.now() - 86400000,
      },
    ];

    // Add demo friends
    await AsyncStorage.setItem(STORAGE_KEYS.FRIENDS, JSON.stringify(demoUsers));

    // Create demo posts
    const demoPosts: Post[] = [
      {
        id: 'post_1',
        userId: 'demo_user_1',
        username: 'MarathonMike',
        runId: 'demo_run_1',
        description: 'Just completed an amazing 10K run! Feeling great! 🏃‍♂️💪',
        distance: 10.0,
        duration: 3600,
        pace: 360,
        date: Date.now() - 3600000,
        likes: ['demo_user_2', 'demo_user_3'],
      },
      {
        id: 'post_2',
        userId: 'demo_user_2',
        username: 'SpeedRunner',
        runId: 'demo_run_2',
        description: 'New personal best today! 5K in under 20 minutes! 🚀',
        distance: 5.0,
        duration: 1180,
        pace: 236,
        date: Date.now() - 7200000,
        likes: ['demo_user_1', 'demo_user_4'],
      },
      {
        id: 'post_3',
        userId: 'demo_user_3',
        username: 'TrailBlazer',
        runId: 'demo_run_3',
        description: 'Beautiful trail run this morning. Nature is the best gym! 🌲',
        distance: 8.5,
        duration: 3060,
        pace: 360,
        date: Date.now() - 10800000,
        likes: ['demo_user_1'],
      },
      {
        id: 'post_4',
        userId: 'demo_user_4',
        username: 'UrbanRunner',
        runId: 'demo_run_4',
        description: 'City run at sunset. Perfect weather for running! 🌇',
        distance: 6.2,
        duration: 1860,
        pace: 300,
        date: Date.now() - 14400000,
        likes: ['demo_user_2', 'demo_user_3'],
      },
    ];

    await AsyncStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(demoPosts));
    await AsyncStorage.setItem(STORAGE_KEYS.DEMO_INITIALIZED, 'true');
  } catch (error) {
    console.error('Error initializing demo data:', error);
  }
};

