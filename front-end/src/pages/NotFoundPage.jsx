import { Link } from 'react-router-dom'

function NotFoundPage() {
  return (
    <section className="status-card">
      <h2>Page Not Found</h2>
      <p>The page you are looking for doesn&apos;t exist or may have been moved.</p>
      <Link to="/" className="btn btn-primary">Back to BillBhai</Link>
    </section>
  )
}

export default NotFoundPage
