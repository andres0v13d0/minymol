import { memo } from 'react';
import CategorySliderHomeOptimized from './CategorySliderHomeOptimized';

const Home = ({ onProductPress, selectedTab = 'home', onTabPress, onSearchPress, isActive = true }) => {
  return (
    <CategorySliderHomeOptimized 
      onProductPress={onProductPress}
      selectedTab={selectedTab}
      onTabPress={onTabPress}
      onSearchPress={onSearchPress}
      isActive={isActive}
    />
  );
};

// ✅ OPTIMIZADO: React.memo para evitar re-renders cuando no cambian las props
export default memo(Home);

