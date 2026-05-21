import { motion } from 'framer-motion'

export default function PageTransition({ children }) {
  return (
    <motion.div
      className="page-motion"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
