import { useEffect } from 'react';
import { useStore } from './store';
import { useGeo } from './geo/useGeo';
import { MapNational } from './components/MapNational';
import { MapProvince } from './components/MapProvince';
import { RestaurantPanel } from './components/RestaurantPanel';
import { Filters } from './components/Filters';
import { asset } from './lib/asset';
import { initHistory } from './navigation';
import type { Restaurant } from './types';
import './App.css';

export function App() {
  const selectedSido = useStore((s) => s.selectedSido);
  const setRestaurants = useStore((s) => s.setRestaurants);
  const { data } = useGeo<Restaurant[]>(asset('data/restaurants.json'));

  useEffect(() => {
    if (data) setRestaurants(data);
  }, [data, setRestaurants]);

  // 뒤로가기/스와이프가 페이지를 종료하지 않고 이전 화면으로 돌아가도록 히스토리 동기화
  useEffect(() => initHistory(), []);

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
          <footer className="app-footer">
            데이터 출처: <a href="https://www.diningcode.com" target="_blank" rel="noreferrer">다이닝코드</a>
            {' · '}프로그램: TV조선 「식객 허영만의 백반기행」 · 팬 제작 비상업 프로젝트
          </footer>
        </aside>
      </div>
    </div>
  );
}

export default App;
