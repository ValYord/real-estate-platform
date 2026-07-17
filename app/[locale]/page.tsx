import HeroSearch from '@/components/home/HeroSearch'
import Categories from '@/components/home/Categories'
import FeaturedListings from '@/components/home/FeaturedListings'
import StatsStrip from '@/components/home/StatsStrip'
import AgentAndCta from '@/components/home/AgentAndCta'

export default function HomePage() {
  return (
    <main>
      <HeroSearch />
      <Categories />
      <FeaturedListings />
      <StatsStrip />
      <AgentAndCta />
    </main>
  )
}
