import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FoodItem, CreateFoodInput, UpdateFoodInput } from "@/types/food";

const COLLECTION_NAME = "foods";
const foodsCollection = collection(db, COLLECTION_NAME);

// Firestore converter for type safety
const foodConverter = {
  toFirestore: (food: CreateFoodInput | UpdateFoodInput) => {
    return {
      ...food,
      updated_at: Timestamp.now(),
    };
  },
  fromFirestore: (snapshot: any): FoodItem => {
    const data = snapshot.data();
    return {
      id: snapshot.id,
      class_name: data.class_name,
      calories_per_100g: data.calories_per_100g,
      default_portion_grams: data.default_portion_grams,
      image_url: data.image_url,
      created_at: data.created_at?.toDate?.()?.toISOString(),
      updated_at: data.updated_at?.toDate?.()?.toISOString(),
    };
  },
};

export const foodService = {
  /**
   * Get all foods from Firestore
   */
  async getAllFoods(): Promise<FoodItem[]> {
    const q = query(foodsCollection, orderBy("class_name", "asc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(foodConverter.fromFirestore);
  },

  /**
   * Get a single food by ID
   */
  async getFoodById(id: string): Promise<FoodItem | null> {
    const docRef = doc(db, COLLECTION_NAME, id);
    const snapshot = await getDoc(docRef);
    
    if (!snapshot.exists()) {
      return null;
    }
    
    return foodConverter.fromFirestore(snapshot);
  },

  /**
   * Create a new food
   */
  async createFood(input: CreateFoodInput): Promise<FoodItem> {
    const docData = {
      ...input,
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    };
    
    const docRef = await addDoc(foodsCollection, docData);
    const snapshot = await getDoc(docRef);
    
    return foodConverter.fromFirestore(snapshot);
  },

  /**
   * Update an existing food
   */
  async updateFood(id: string, input: UpdateFoodInput): Promise<FoodItem> {
    const docRef = doc(db, COLLECTION_NAME, id);
    
    await updateDoc(docRef, {
      ...input,
      updated_at: Timestamp.now(),
    });
    
    const snapshot = await getDoc(docRef);
    return foodConverter.fromFirestore(snapshot);
  },

  /**
   * Delete a food
   */
  async deleteFood(id: string): Promise<void> {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  },

  /**
   * Get food by class name
   */
  async getFoodByClassName(className: string): Promise<FoodItem | null> {
    const foods = await this.getAllFoods();
    return foods.find(
      (f) => f.class_name.toLowerCase() === className.toLowerCase()
    ) || null;
  },
};
