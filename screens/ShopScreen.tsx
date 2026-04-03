import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  initConnection,
  endConnection,
  fetchProducts,
  requestPurchase,
  purchaseUpdatedListener,
  purchaseErrorListener,
  finishTransaction,
  ErrorCode,
} from 'expo-iap';
import { Colors } from '../constants/colors';
import { userAPI } from '../services/api';

// 스토어에 등록한 상품 ID (App Store Connect / Google Play Console에서 동일하게 등록)
const PRODUCT_IDS = {
  hearts5:  'com.pingup.app.hearts5',
  hearts15: 'com.pingup.app.hearts15',
  hearts35: 'com.pingup.app.hearts35',
};

const PACKAGES = [
  { id: 'starter',  productId: PRODUCT_IDS.hearts5,  hearts: 5,  price: '₩2,900', perHeart: '₩580/하트', label: null },
  { id: 'popular',  productId: PRODUCT_IDS.hearts15, hearts: 15, price: '₩6,900', perHeart: '₩460/하트', label: '인기' },
  { id: 'premium',  productId: PRODUCT_IDS.hearts35, hearts: 35, price: '₩12,900', perHeart: '₩370/하트', label: '베스트' },
];

type Props = {
  hearts: number;
  onHeartsAdded: (amount: number) => void;
  onClose: () => void;
};

export default function ShopScreen({ hearts, onHeartsAdded, onClose }: Props) {
  const [products, setProducts] = useState<Record<string, string>>({}); // productId → 실제 가격
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    try {
      await initConnection();
      const result = await fetchProducts({
        skus: Object.values(PRODUCT_IDS),
        type: 'in-app',
      });
      const priceMap: Record<string, string> = {};
      result.forEach((p: any) => {
        priceMap[p.productId ?? p.sku] = p.localizedPrice ?? p.price;
      });
      setProducts(priceMap);
    } catch {
      // 스토어 미등록 시 기본 가격 사용
    } finally {
      setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();

    const purchaseListener = purchaseUpdatedListener(async (purchase) => {
      const productId = purchase.productId;
      const pkg = PACKAGES.find((p) => p.productId === productId);
      if (!pkg) return;

      try {
        await finishTransaction({ purchase, isConsumable: true });
        // 서버에 하트 지급 요청
        const res = await userAPI.addHearts(pkg.hearts, productId, purchase.transactionId || '');
        if (res.ok) {
          onHeartsAdded(pkg.hearts);
          Alert.alert('충전 완료! 🎉', `${pkg.hearts}하트가 충전되었습니다`);
        }
      } catch {
        Alert.alert('오류', '결제 처리 중 오류가 발생했습니다');
      } finally {
        setPurchasing(null);
      }
    });

    const errorListener = purchaseErrorListener((error) => {
      setPurchasing(null);
      if (error.code !== ErrorCode.UserCancelled) {
        Alert.alert('결제 오류', error.message);
      }
    });

    return () => {
      purchaseListener.remove();
      errorListener.remove();
      endConnection();
    };
  }, []);

  const handleBuy = async (pkg: typeof PACKAGES[0]) => {
    if (purchasing) return;
    setPurchasing(pkg.productId);
    try {
      await requestPurchase({
        request: {
          apple: { sku: pkg.productId },
          google: { skus: [pkg.productId] },
        },
        type: 'in-app',
      });
    } catch {
      setPurchasing(null);
    }
  };

  const handleFreeHeart = () => {
    onHeartsAdded(1);
    Alert.alert('하트 지급! 🎉', '광고 시청으로 1하트를 받았습니다\n(개발 중)');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeBtn}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>하트 충전</Text>
        <View style={styles.heartBadge}>
          <Text style={styles.heartBadgeText}>🤍 {hearts}</Text>
        </View>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>보유 하트</Text>
          <Text style={styles.balanceValue}>🤍 {hearts}</Text>
          <Text style={styles.balanceHint}>하트 1개 = 핑 1회 발송</Text>
        </View>

        <View style={styles.freeCard}>
          <View style={styles.freeLeft}>
            <Text style={styles.freeEmoji}>📺</Text>
            <View>
              <Text style={styles.freeTitle}>광고 보고 무료 하트 받기</Text>
              <Text style={styles.freeSub}>30초 광고 시청 후 1하트 지급</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.freeBtn} onPress={handleFreeHeart}>
            <Text style={styles.freeBtnText}>받기</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>하트 패키지</Text>

        {loadingProducts ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          PACKAGES.map((pkg) => {
            const displayPrice = products[pkg.productId] || pkg.price;
            const isLoading = purchasing === pkg.productId;
            return (
              <TouchableOpacity
                key={pkg.id}
                style={[styles.packageCard, pkg.label === '인기' && styles.packageCardPopular]}
                onPress={() => handleBuy(pkg)}
                disabled={!!purchasing}
              >
                {pkg.label && (
                  <View style={[styles.packageBadge, pkg.label === '베스트' && styles.packageBadgeBest]}>
                    <Text style={styles.packageBadgeText}>{pkg.label}</Text>
                  </View>
                )}
                <Text style={styles.packageHearts}>🤍 {pkg.hearts}하트</Text>
                <View style={styles.packageRight}>
                  {isLoading ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <>
                      <Text style={styles.packagePrice}>{displayPrice}</Text>
                      <Text style={styles.packagePerHeart}>{pkg.perHeart}</Text>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, paddingHorizontal: 16 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.grayLight,
  },
  closeBtn: { color: Colors.white, fontSize: 18 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: Colors.white },
  heartBadge: {
    backgroundColor: Colors.surface, paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: Colors.grayLight,
  },
  heartBadgeText: { color: Colors.white, fontSize: 13, fontWeight: '600' },
  balanceCard: {
    backgroundColor: Colors.primary, borderRadius: 16, padding: 24,
    alignItems: 'center', marginTop: 16, marginBottom: 12, gap: 4,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  balanceValue: { color: Colors.white, fontSize: 40, fontWeight: 'bold' },
  balanceHint: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
  freeCard: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 24, borderWidth: 1, borderColor: Colors.grayLight,
  },
  freeLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  freeEmoji: { fontSize: 32 },
  freeTitle: { color: Colors.white, fontSize: 14, fontWeight: '600' },
  freeSub: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
  freeBtn: { backgroundColor: Colors.grayLight, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  freeBtnText: { color: Colors.white, fontWeight: '700', fontSize: 13 },
  sectionTitle: { color: Colors.white, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  packageCard: {
    backgroundColor: Colors.surface, borderRadius: 14, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10, borderWidth: 1, borderColor: Colors.grayLight, position: 'relative',
  },
  packageCardPopular: { borderColor: Colors.primary, backgroundColor: '#1A0D1A' },
  packageBadge: {
    position: 'absolute', top: -10, left: 16,
    backgroundColor: Colors.primary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8,
  },
  packageBadgeBest: { backgroundColor: '#FFB800' },
  packageBadgeText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  packageHearts: { color: Colors.white, fontSize: 20, fontWeight: 'bold' },
  packageRight: { alignItems: 'flex-end', minWidth: 80 },
  packagePrice: { color: Colors.white, fontSize: 16, fontWeight: '700' },
  packagePerHeart: { color: Colors.textMuted, fontSize: 12, marginTop: 2 },
});
