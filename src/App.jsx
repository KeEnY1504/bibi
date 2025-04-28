import { Outlet, Link } from 'react-router-dom';

const App = () => {
  return (
    <div>
      <nav>
        <Link to="/page1">Page 1</Link>
        <Link to="/page2">Page 2</Link>
      </nav>
      <Outlet />
    </div>
  );
};

export default App