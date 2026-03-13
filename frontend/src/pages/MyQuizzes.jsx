import React, { useState, useEffect } from 'react';
import { FaTrophy, FaUser } from 'react-icons/fa';
import { quizAPI, quizResultsAPI } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const MyQuizzes = ({ classData }) => {
  const { t } = useLanguage();
  const [quizzes, setQuizzes] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const classId = classData?.id ?? classData?._id;

  useEffect(() => {
    if (!classId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [quizRes, resultRes] = await Promise.all([
          quizAPI.getClassQuizzes(classId),
          quizResultsAPI.getByClass(classId).catch(() => ({ results: [] }))
        ]);
        if (!cancelled) {
          setQuizzes(quizRes.quizzes || []);
          setResults(resultRes.results || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Failed to load quizzes.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [classId]);

  const getResultsForQuiz = (quizId) => {
    const qid = String(quizId ?? '');
    return results.filter(r => String(r.quiz?._id ?? r.quiz?.id ?? r.quiz) === qid);
  };

  const getPlayerEntriesForQuiz = (quizId) => {
    const quizResults = getResultsForQuiz(quizId);
    return quizResults.flatMap((result) =>
      (result.playerResults || []).map((pr, idx) => ({
        ...pr,
        _entryKey: `${result.id}-${idx}`,
        _finishedAt: result.finishedAt,
      }))
    );
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatTimeSecs = (value) => {
    if (value == null) return null;
    const num = Number(value);
    if (Number.isNaN(num)) return null;
    const secs = num >= 1000 ? Math.round(num / 1000) : Math.round(num);
    const minutes = Math.floor(secs / 60);
    const remainingSeconds = secs % 60;

    if (minutes <= 0) {
      return `(${secs} sec${secs === 1 ? '' : 's'})`;
    }

    if (remainingSeconds === 0) {
      return `(${minutes} min${minutes === 1 ? '' : 's'})`;
    }

    return `(${minutes} min${minutes === 1 ? '' : 's'} ${remainingSeconds} sec${remainingSeconds === 1 ? '' : 's'})`;
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center bg-no-repeat flex items-start justify-center p-4"
      style={{ backgroundImage: `url('/images/bg.jpg')` }}
    >
      <div className="w-full max-w-3xl mt-8">
        <div className="flex flex-col items-center mb-4">
          <div
            className="px-6 py-1.5 rounded-lg relative"
            style={{
              backgroundColor: '#8B4513',
              clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 50%, calc(100% - 20px) 100%, 0 100%)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)'
            }}
          >
            <h1 className="text-xl font-bold text-white">{t('classroom_myQuizzes')}</h1>
          </div>
        </div>

        <div
          className="rounded-lg p-4 overflow-y-auto"
          style={{
            backgroundColor: '#F5DEB3',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
            minHeight: 'calc(100vh - 140px)',
            maxHeight: 'calc(100vh - 140px)'
          }}
        >
          {loading ? (
            <p className="text-center text-gray-700 font-bold py-8">{t('myQuizzes_loading')}</p>
          ) : error ? (
            <p className="text-center text-red-700 font-bold py-8">{error}</p>
          ) : quizzes.length === 0 ? (
            <p className="text-center text-gray-700 font-bold py-8">
              {t('myQuizzes_empty')}
            </p>
          ) : (
            <div className="space-y-4">
              {quizzes.map((quiz) => {
                const quizResults = getResultsForQuiz(quiz.id ?? quiz._id);
                const playerEntries = getPlayerEntriesForQuiz(quiz.id ?? quiz._id);
                return (
                  <div
                    key={quiz.id ?? quiz._id}
                    className="rounded-lg p-4 border-2 border-amber-800"
                    style={{ backgroundColor: '#FFF8DC' }}
                  >
                    <div className="mb-2">
                      <h2 className="font-bold text-lg text-gray-900">
                        {quiz.title || t('myQuizzes_untitled')}
                      </h2>
                      {(quiz.category || quiz.difficulty) && (
                        <p className="text-sm text-gray-600">
                          {[quiz.category, quiz.difficulty].filter(Boolean).join(' • ')}
                        </p>
                      )}
                    </div>

                    {playerEntries.length > 0 ? (
                      <div className="mt-3 pt-3 border-t border-amber-700">
                        <p className="text-xs font-bold text-amber-900 mb-2">
                          {playerEntries.length === 1
                            ? t('myQuizzes_savedResult', { count: playerEntries.length })
                            : t('myQuizzes_savedResults', { count: playerEntries.length })}
                        </p>
                        <ul className="space-y-1.5">
                          {playerEntries.map((pr) => (
                            <li
                              key={pr._entryKey}
                              className="flex items-center justify-between text-sm py-2 px-2 rounded"
                              style={{ backgroundColor: 'rgba(139, 69, 19, 0.1)' }}
                            >
                              <span className="flex items-center gap-2 font-medium text-gray-800">
                                <FaUser size={12} />
                                <span>
                                  {pr.playerName}
                                  <span className="block text-[11px] text-gray-500 font-normal">
                                    {formatDate(pr._finishedAt)}
                                  </span>
                                </span>
                                {pr.finishedFirst && (
                                  <span className="text-amber-700 font-bold flex items-center gap-0.5">
                                    <FaTrophy size={12} /> 1st
                                  </span>
                                )}
                              </span>
                              <span className="text-gray-700 text-right">
                                {t('myQuizzes_pointsCorrect', { points: pr.points, correct: pr.correctAnswers })}
                                {formatTimeSecs(pr.timeToFinishSeconds) && (
                                  <span className="text-gray-500 ml-1"> {formatTimeSecs(pr.timeToFinishSeconds)}</span>
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 mt-2">{t('myQuizzes_noResults')}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyQuizzes;
