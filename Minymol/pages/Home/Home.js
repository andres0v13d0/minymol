import CategorySliderHomeOptimized from './CategorySliderHomeOptimized';

const Home = ({ onProductPress, selectedTab = 'home', onTabPress }) => {
  return (
    <CategorySliderHomeOptimized 
      onProductPress={onProductPress}
      selectedTab={selectedTab}
      onTabPress={onTabPress}
    />
  );
};

export default Home;
