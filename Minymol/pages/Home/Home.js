import CategorySliderHomeOptimized from './CategorySliderHomeOptimized';

const Home = ({ onProductPress, selectedTab = 'home', onTabPress, onSearchPress }) => {
  return (
    <CategorySliderHomeOptimized 
      onProductPress={onProductPress}
      selectedTab={selectedTab}
      onTabPress={onTabPress}
      onSearchPress={onSearchPress}
    />
  );
};

export default Home;

