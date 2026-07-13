import { useEffect } from 'react';
import { useStore } from './store';
import { useGeo } from './geo/useGeo';
import { MapNational } from './components/MapNational';
import { MapProvince } from './components/MapProvince';
import { RestaurantPanel } from './components/RestaurantPanel';
import { Filters } from './components/Filters';
import type { Restaurant } from './types';
import './App.css';

export function App() {
  const selectedSido = useStore((s) => s.selectedSido);
  const setRestaurants = useStore((s) => s.setRestaurants);
  const { data } = useGeo<Restaurant[]>('/data/restaurants.json');

  useEffect(() => {
    if (data) setRestaurants(data);
  }, [data, setRestaurants]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🍚 허영만 백반기행 맛집 지도</h1>
        <p className="sub">지도에서 지역을 눌러 백반기행 맛집을 찾아보세요</p>
      </header>
      <div className="layout">
        <section className="map">
          {selectedSido ? <MapProvince /> : <MapNational />}
        </section>
        <aside className="side">
          <Filters />
          <RestaurantPanel />
        </aside>
      </div>
    </div>
  );
}

export default App;
