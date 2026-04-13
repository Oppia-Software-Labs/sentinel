import Navbar from '@/components/Navbar'
import HeroMain from '@/components/HeroMain'
import ProblemSection from '@/components/sections/ProblemSection'
import GovernanceLayersScroll from '@/components/sections/GovernanceLayersScroll'
import BentoGrid from '@/components/sections/BentoGrid'
import FaqSection from '@/components/sections/FaqSection'

export default function Home() {
  return (
    <>
      <Navbar />
      <HeroMain />
      <ProblemSection />
      <GovernanceLayersScroll />
      <BentoGrid />
      <FaqSection />
    </>
  )
}
