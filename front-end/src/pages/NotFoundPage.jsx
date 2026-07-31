import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <section className="status-card">
      <h2>Page Not Found</h2>
      <p>The requested route does not exist.</p>
      <Link to="/">Return to home</Link>
    </section>
  )
}

export default NotFoundPage
