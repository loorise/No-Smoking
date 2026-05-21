import { AnimatePresence, motion } from 'framer-motion'

export default function AnimatedTimePart({ value }) {
  return (
    <span className="time-part">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          className="time-part-value"
          initial={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
