import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Users, DollarSign, TrendingUp, Share2, X, UserPlus, Receipt } from 'lucide-react';

export default function ExpenseSplitter() {
  const [people, setPeople] = useState(['Alex', 'Jordan']);
  const [newPerson, setNewPerson] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [expenseForm, setExpenseForm] = useState({
    description: '',
    amount: '',
    paidBy: 'Alex',
    splitAmong: ['Alex', 'Jordan']
  });
  const [groupId, setGroupId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPeopleModal, setShowPeopleModal] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlGroupId = urlParams.get('group');
    
    if (urlGroupId) {
      setGroupId(urlGroupId);
      loadGroupData(urlGroupId);
    } else {
      const newGroupId = generateGroupId();
      setGroupId(newGroupId);
      const storedData = localStorage.getItem(`expenses_${newGroupId}`);
      if (!storedData) {
        saveGroupData(newGroupId, people, []);
      }
    }
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const generateGroupId = () => {
    return 'group_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  };

  const loadGroupData = (id) => {
    try {
      const stored = localStorage.getItem(`expenses_${id}`);
      if (stored) {
        const data = JSON.parse(stored);
        setPeople(data.people || ['Alex', 'Jordan']);
        setExpenses(data.expenses || []);
        setExpenseForm({
          description: '',
          amount: '',
          paidBy: data.people?.[0] || 'Alex',
          splitAmong: data.people || ['Alex', 'Jordan']
        });
      }
    } catch (error) {
      console.log('Starting fresh group');
    }
  };

  const saveGroupData = (id, peopleList, expensesList) => {
    try {
      localStorage.setItem(
        `expenses_${id}`,
        JSON.stringify({
          people: peopleList,
          expenses: expensesList,
          lastUpdated: new Date().toISOString()
        })
      );
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  useEffect(() => {
    if (!loading && groupId) {
      saveGroupData(groupId, people, expenses);
    }
  }, [people, expenses, groupId, loading]);

  const getShareableLink = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?group=${groupId}`;
  };

  const copyShareLink = () => {
    const link = getShareableLink();
    navigator.clipboard.writeText(link);
    alert('Link copied! Note: Each person will have their own copy of the data in their browser.');
  };

  const addPerson = () => {
    if (newPerson.trim() && !people.includes(newPerson.trim())) {
      const updated = [...people, newPerson.trim()];
      setPeople(updated);
      setExpenseForm({
        ...expenseForm,
        splitAmong: updated
      });
      setNewPerson('');
    }
  };

  const removePerson = (person) => {
    if (people.length > 2) {
      const updated = people.filter(p => p !== person);
      setPeople(updated);
      setExpenseForm({
        ...expenseForm,
        paidBy: expenseForm.paidBy === person ? updated[0] : expenseForm.paidBy,
        splitAmong: expenseForm.splitAmong.filter(p => p !== person)
      });
    }
  };

  const toggleSplitPerson = (person) => {
    const isIncluded = expenseForm.splitAmong.includes(person);
    setExpenseForm({
      ...expenseForm,
      splitAmong: isIncluded 
        ? expenseForm.splitAmong.filter(p => p !== person)
        : [...expenseForm.splitAmong, person]
    });
  };

  const addExpense = () => {
    if (expenseForm.description && expenseForm.amount && expenseForm.splitAmong.length > 0) {
      setExpenses([...expenses, {
        id: Date.now(),
        description: expenseForm.description,
        amount: parseFloat(expenseForm.amount),
        paidBy: expenseForm.paidBy,
        splitAmong: [...expenseForm.splitAmong]
      }]);
      setExpenseForm({
        description: '',
        amount: '',
        paidBy: expenseForm.paidBy,
        splitAmong: people
      });
      setShowExpenseModal(false);
    }
  };

  const deleteExpense = (id) => {
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const calculateBalances = () => {
    const balances = {};
    people.forEach(person => balances[person] = 0);

    expenses.forEach(expense => {
      const shareAmount = expense.amount / expense.splitAmong.length;
      balances[expense.paidBy] += expense.amount;
      expense.splitAmong.forEach(person => {
        balances[person] -= shareAmount;
      });
    });

    return balances;
  };

  const calculateSettlements = () => {
    const balances = calculateBalances();
    const settlements = [];
    
    const debtors = Object.entries(balances)
      .filter(([_, balance]) => balance < -0.01)
      .map(([person, balance]) => ({ person, amount: -balance }))
      .sort((a, b) => b.amount - a.amount);
    
    const creditors = Object.entries(balances)
      .filter(([_, balance]) => balance > 0.01)
      .map(([person, balance]) => ({ person, amount: balance }))
      .sort((a, b) => b.amount - a.amount);

    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const payment = Math.min(debtors[i].amount, creditors[j].amount);
      settlements.push({
        from: debtors[i].person,
        to: creditors[j].person,
        amount: payment
      });

      debtors[i].amount -= payment;
      creditors[j].amount -= payment;

      if (debtors[i].amount < 0.01) i++;
      if (creditors[j].amount < 0.01) j++;
    }

    return settlements;
  };

  const balances = calculateBalances();
  const settlements = calculateSettlements();
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const getPersonColor = (index) => {
    const colors = [
      'from-pink-500 to-rose-500',
      'from-blue-500 to-cyan-500',
      'from-purple-500 to-indigo-500',
      'from-amber-500 to-orange-500',
      'from-emerald-500 to-teal-500',
      'from-fuchsia-500 to-pink-500'
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-purple-200 text-lg font-medium">Loading your group...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 pb-20">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
        * { font-family: 'Poppins', sans-serif; }
        
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        
        .animate-slideUp { animation: slideUp 0.4s ease-out; }
        .glass { 
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .hover-lift {
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .hover-lift:hover {
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
      `}</style>

      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20"></div>
        <div className="max-w-7xl mx-auto px-6 py-8 relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/50">
                <DollarSign className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white tracking-tight">SplitEasy</h1>
                <p className="text-purple-200">Split expenses, stay friends</p>
              </div>
            </div>
            <button
              onClick={() => setShowShareModal(true)}
              className="glass px-6 py-3 rounded-xl text-white font-medium hover:bg-white/20 transition flex items-center gap-2 hover-lift"
            >
              <Share2 className="w-5 h-5" />
              Share Group
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-6 mb-8 animate-slideUp">
          <div className="glass p-6 rounded-2xl hover-lift">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-purple-200 text-sm">Total Expenses</p>
                <p className="text-3xl font-bold text-white">${totalExpenses.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="glass p-6 rounded-2xl hover-lift">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-purple-200 text-sm">Group Members</p>
                <p className="text-3xl font-bold text-white">{people.length}</p>
              </div>
            </div>
          </div>

          <div className="glass p-6 rounded-2xl hover-lift">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-purple-200 text-sm">Settlements Needed</p>
                <p className="text-3xl font-bold text-white">{settlements.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="glass p-6 rounded-2xl animate-slideUp">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Group Members
                </h2>
                <button
                  onClick={() => setShowPeopleModal(true)}
                  className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center hover:scale-110 transition shadow-lg shadow-purple-500/50"
                >
                  <UserPlus className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="space-y-2">
                {people.map((person, idx) => (
                  <div key={person} className={`p-4 rounded-xl bg-gradient-to-r ${getPersonColor(idx)} bg-opacity-20 border border-white/10`}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{person}</span>
                      {people.length > 2 && (
                        <button
                          onClick={() => removePerson(person)}
                          className="text-white/60 hover:text-white transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass p-6 rounded-2xl">
              <h2 className="text-xl font-bold text-white mb-4">Balances</h2>
              <div className="space-y-3">
                {people.map((person) => {
                  const balance = balances[person];
                  return (
                    <div key={person} className="flex items-center justify-between">
                      <span className="text-white font-medium">{person}</span>
                      <span className={`text-lg font-bold px-4 py-1 rounded-lg ${
                        balance > 0.01 
                          ? 'bg-emerald-500/20 text-emerald-300' 
                          : balance < -0.01 
                          ? 'bg-rose-500/20 text-rose-300' 
                          : 'bg-slate-500/20 text-slate-300'
                      }`}>
                        {balance > 0.01 ? '+' : ''}{balance.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {settlements.length > 0 && (
              <div className="glass p-6 rounded-2xl">
                <h2 className="text-xl font-bold text-white mb-4">💸 Settle Up</h2>
                <div className="space-y-3">
                  {settlements.map((settlement, idx) => (
                    <div key={idx} className="bg-gradient-to-r from-rose-500/10 to-emerald-500/10 p-4 rounded-xl border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-rose-300 font-semibold">{settlement.from}</span>
                        <span className="text-white/60">→</span>
                        <span className="text-emerald-300 font-semibold">{settlement.to}</span>
                      </div>
                      <p className="text-2xl font-bold text-white text-center">
                        ${settlement.amount.toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="glass p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Receipt className="w-6 h-6" />
                  Expenses
                </h2>
                <button
                  onClick={() => setShowExpenseModal(true)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 rounded-xl text-white font-semibold hover:scale-105 transition shadow-lg shadow-purple-500/50 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Add Expense
                </button>
              </div>

              {expenses.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Receipt className="w-10 h-10 text-purple-300" />
                  </div>
                  <p className="text-purple-200 text-lg mb-2">No expenses yet</p>
                  <p className="text-purple-300/60">Add your first expense to get started!</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {expenses.map((expense, idx) => (
                    <div key={expense.id} className="bg-white/5 hover:bg-white/10 p-5 rounded-xl border border-white/10 hover-lift transition-all" style={{animationDelay: `${idx * 0.05}s`}}>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-white mb-1">{expense.description}</h3>
                          <div className="flex items-center gap-3 text-sm text-purple-200">
                            <span className="bg-purple-500/20 px-3 py-1 rounded-lg">
                              {expense.paidBy} paid
                            </span>
                            <span className="text-purple-300/60">
                              Split: {expense.splitAmong.join(', ')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold text-white">
                            ${expense.amount.toFixed(2)}
                          </span>
                          <button
                            onClick={() => deleteExpense(expense.id)}
                            className="w-10 h-10 bg-rose-500/20 hover:bg-rose-500/40 rounded-lg flex items-center justify-center transition text-rose-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-slideUp">
          <div className="glass p-8 rounded-2xl max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">New Expense</h3>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                placeholder="What's this for?"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <input
                type="number"
                step="0.01"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                placeholder="Amount ($)"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <select
                value={expenseForm.paidBy}
                onChange={(e) => setExpenseForm({...expenseForm, paidBy: e.target.value})}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {people.map(person => (
                  <option key={person} value={person} className="bg-slate-800">{person} paid</option>
                ))}
              </select>
              <div>
                <p className="text-sm font-medium text-purple-200 mb-3">Split among:</p>
                <div className="flex flex-wrap gap-2">
                  {people.map((person, idx) => (
                    <button
                      key={person}
                      onClick={() => toggleSplitPerson(person)}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        expenseForm.splitAmong.includes(person)
                          ? `bg-gradient-to-r ${getPersonColor(idx)} text-white shadow-lg`
                          : 'bg-white/10 text-purple-200 hover:bg-white/20'
                      }`}
                    >
                      {person}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={addExpense}
                disabled={!expenseForm.description || !expenseForm.amount}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4 rounded-xl font-semibold hover:scale-105 transition shadow-lg shadow-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Add Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {showPeopleModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-slideUp">
          <div className="glass p-8 rounded-2xl max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Add Member</h3>
              <button
                onClick={() => setShowPeopleModal(false)}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPerson}
                onChange={(e) => setNewPerson(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addPerson()}
                placeholder="Name..."
                className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={() => {
                  addPerson();
                  setShowPeopleModal(false);
                }}
                className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-3 rounded-xl text-white font-semibold hover:scale-105 transition shadow-lg shadow-purple-500/50"
              >
                <UserPlus className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-slideUp">
          <div className="glass p-8 rounded-2xl max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Share Group</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <p className="text-purple-200 mb-4">
              Share this link with your group. Note: Data is stored locally in each person's browser.
            </p>
            <div className="bg-white/10 p-4 rounded-xl mb-4 break-all text-sm text-purple-100 border border-white/20">
              {getShareableLink()}
            </div>
            <button
              onClick={copyShareLink}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4 rounded-xl font-semibold hover:scale-105 transition shadow-lg shadow-purple-500/50 flex items-center justify-center gap-2"
            >
              <Share2 className="w-5 h-5" />
              Copy Link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
